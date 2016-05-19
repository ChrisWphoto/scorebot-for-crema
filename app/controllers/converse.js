/*
  Analyzes text associated with direct mention (@scorebot)
  and responds accordingly
*/
"use strict";

var Medal         = require('../models/medal');
var Slacklete     = require('../models/slacklete');
var RegExPatterns = require('../utils/regexPatterns');
var SlackAPI      = require('../utils/slackAPI');


function getReactions(msg) {
  return msg.text.match(/:\w+:/g); //e.g. [':simple_smile:']
};

function getReactionValues(msg) {
  return msg.text.match(/\d+|-\d+/g); // single and multiple digits e.g. ['35'] || ['1']
};

//e.g. [:smile:] --> [smile]
function stripColons(array){
  return array.map( react => react.substring(1, react.length -1) );
};


function saveMedalValue(medalArray, medalValArray, bot, msg){
  console.log(medalValArray);
  let medalName   = stripColons(medalArray)[0]; //grab only first reaction name
  let medalValue  = medalValArray[0]; //grab only first medal value
  let query       = Medal.where({reaction: medalName, team_id: bot.team_info.id});
  let medalData   = {reaction: medalName, value: medalValue};
  console.log(medalData);
  Medal.findOneAndUpdate(query, medalData, {
    upsert: true,
    new: true
  }, (err, newMedal) => {
    if (err) {console.log("medal failed to update:", err); return;}
    console.log('Medal Updated via conversation:\n', newMedal);
    bot.reply(msg,"The game has changed! :" + newMedal.reaction + ": is now worth " + newMedal.value + "pts.");
  }); 
};

function resetScoresInDB(bot,msg){
  Slacklete.find({team_id: bot.team_info.id})
    .exec( (err, slackletes) => {
      if (err){ console.log('Error finding slacklete by teamid:',err); return; }
      slackletes.forEach( (slacker) => slacker.resetScore() );
      setTimeout(() =>{
        bot.reply(msg,"It's done. Everyone is reset. Let the games begin anew! :champagne:");  
      }, 1700);
      
    }); 
};

//Global help text for scorebot commands 
let scorebotCommandsText = "You can ask me things like ```@scorebot what's my score?``` ```@scorebot show me all the medals``` ```@scorebot make :smile: = 40pts``` ```@scorebot who's winning?```";
let scorebotHelpText = "No problem! you can type: `@scorebot commands` in any channel I'm in an see all my skills";

var Converse = {
  
  updateMedal: function(bot, msg) {
    let arrayOfNumbers = getReactionValues(msg);
    let arrayOfReactions = getReactions(msg);
    //received reaction(s) and value(s) persisting in database   
    if (arrayOfNumbers && arrayOfReactions){
      saveMedalValue(arrayOfReactions, arrayOfNumbers, bot, msg);
    }else { //Ask user to fill in missing info to set value of medal
      console.log('Missing info trying to update medal',arrayOfNumbers, arrayOfReactions);
      let MedalErrText = "Well that didn't work :pensive: Try `@scorebot :smile: = 15`";
      bot.reply(msg, MedalErrText);
    } 
  },
  
  commands: function(bot,msg){
    bot.reply(msg, scorebotCommandsText);
  },
  
  resetScores: function(bot, msg){
    bot.startConversation(msg, ( res, convo ) => {
      let areYouSure = "Are you sure you want to reset everyone's score? Type `reset scores` or just say no."
      convo.ask(areYouSure, [
        {
          pattern: 'reset',
          callback: (res, convo) => {
            convo.say("OK! You asked for it. Resetting everyone's score...");
            resetScoresInDB(bot, msg);
            convo.next();       
          }
        },
        {
          pattern: RegExPatterns.no,
          callback: function(response,convo) {
            convo.say(':sweat: Phew that was close!');
            convo.next();
          }
        }
      ])
    });
  },
  
  
  whatDoYouDo: function(bot, msg) {
    let aboutMeText = "I am Mr. Scorebot and I award points of awesomeness to people who get reactions on their messages.";
    //prepare and object that can be passed to YesSeeMeInAction via bind
    this.helpObj = {botFromHelp: bot};
    bot.startConversation(msg, ( res, convo ) => {
      convo.say(aboutMeText);
      convo.ask('Do you wanna see me in action?',[
        {
          pattern: RegExPatterns.yes,
          callback: YesSeeMeInAction.bind(this) //this function has access to the "bot" becase of bind & helpObj
        },
        {
          pattern: RegExPatterns.no,
          callback: function(response,convo) {
            convo.say(scorebotHelpText);
            convo.next();
          }
      }
      ]);
    });
  }
    
}

function YesSeeMeInAction(res,convo){
  //grab values from help function above
  let bot = this.helpObj.botFromHelp;
  //add robot_face to last message from user
  bot.api.reactions.add({
    timestamp: res.ts,
    channel: res.channel,
    name: 'robot_face',
  },function(err) {
  if (err) { console.log(err) }
    convo.say('Did you catch it? I just put a :robot_face: on your last message, which means you get points! :tada:');
    convo.ask("Do you wanna see things you can ask me?.", [
      {
        pattern: RegExPatterns.yes,
        callback: function(res,convo) {
          console.log('yes see what I do', res);            
          convo.say(scorebotCommandsText);
          convo.next();
        }
      },
      {
        pattern: RegExPatterns.no,
        callback: function(response,convo) {
          convo.say(scorebotHelpText);
          convo.next();
        }
      }
    ]);
    convo.next();
});
};
module.exports = Converse;
