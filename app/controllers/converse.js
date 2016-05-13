/*
  Analyzes text associated with direct mention (@scorebot)
  and responds accordingly
*/
"use strict";

var Medal         = require('../models/medal');



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


/*
Each team can have it's own set of medals.
There is a default value for each medal.
step 1: verfiy reaction is legit slack reaction (implement later) 
step 2: If exist for that team return/update that medal
step 2a: if NOT exist for team use default. 
 */ 

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
}

//Global help text for scorebot commands 
var scorebotCommandsText = "You can ask me things like ```@scorebot show me all the medals``` ```@scorebot make :smile: = 40pts``` ```@scorebot who's winning?```";

var Converse = {
  
  updateMedal: function(bot, msg) {
    let arrayOfNumbers = getReactionValues(msg);
    let arrayOfReactions = getReactions(msg);
    //received reaction(s) and value(s) persisting in database   
    if (arrayOfNumbers && arrayOfReactions){
      saveMedalValue(arrayOfReactions, arrayOfNumbers, bot, msg);
    }else { //Ask user to fill in missing info to set value of medal
      console.log('Missing info trying to update medal',arrayOfNumbers, arrayOfReactions)
      
      //we are missing the reaction
      if (!arrayOfReactions && arrayOfNumbers){
        bot.startConversation(msg, ( res, convo ) => {
          let question = "Hi :simple_smile: To update reactions I first need a reaction, send me :a_reaction: or click the face on the right." 
          convo.ask(question, ( res, convo ) => {
            let arrayOfReactions = getReactions(res);
            if(arrayOfReactions) saveMedalValue(arrayOfReactions, arrayOfNumbers, bot, msg);
            convo.next();
          });
        }); 
      }
      
      //we are missing the value of the reaction
      else if (arrayOfReactions && !arrayOfNumbers){
        bot.startConversation(msg, ( res, convo ) => {
          let question = "Hi :simple_smile: To update reactions I first need a number, send me a 5 a 10 or whatever number you want." 
          convo.ask(question, ( res, convo ) => {
            let arrayOfNumbers = getReactionValues(res);
            if(arrayOfReactions) saveMedalValue(arrayOfReactions, arrayOfNumbers, bot, msg);
            convo.next();
          });
        }); 
      }

      //we are missing both reaction and value
      else {
        bot.reply(msg,"I think you're trying to set the value of a reaction. Try sending this: :smirk: = 5");
      }      
    } 
  },
  
  commands: function(bot,msg){
    bot.reply(msg, scorebotCommandsText);
  },
  
  help: function(bot, msg) {
    let aboutMeText = "I am Mr. Scorebot and I award points of awesomeness to people who get reactions on their messages.";
    //prepare and object that can be passed to YesSeeMeInAction via bind
    this.helpObj = {botFromHelp: bot};
    bot.startConversation(msg, ( res, convo ) => {
      convo.say(aboutMeText);
      convo.ask('Do you wanna see me in action?',[
        {
          pattern: bot.utterances.yes,
          callback: YesSeeMeInAction.bind(this) //this function has access to the "bot" becase of bind & helpObj
        },
        {
          pattern: bot.utterances.no,
          callback: function(response,convo) {
            convo.say("No problem!\n" + scorebotCommandsText);
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
  console.log('yes bot res\n', this.myObj);
  console.log('this.bot',this.help);
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
        pattern: bot.utterances.yes,
        callback: function(res,convo) {
          console.log('yes see what I do', res);            
          convo.say(scorebotCommandsText);
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        callback: function(response,convo) {
          convo.say("No problem!\n you can type: '@scorebot commands' in any channel I am invited to.");
          convo.next();
        }
      }
    ]);
    convo.next();
});
};
module.exports = Converse;
