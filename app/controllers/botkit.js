//CONFIG===============================================

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');
var Slacklete     = require('../models/slacklete');
var Medal         = require('../models/medal');
var ScoreKeeper   = require('./scoreKeeper');
var scoreboard    = require('../utils/scoreboard');
var Converse      = require('./converse');

var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/botkit_scorebot'
var botkit_mongo_storage = require('../../config/botkit_mongo_storage')({mongoUri: mongoUri})

if (!process.env.SLACK_ID || !process.env.SLACK_SECRET || !process.env.PORT) {
  console.log('Error: Specify SLACK_ID SLACK_SECRET and PORT in environment');
  process.exit(1);
}

var controller = Botkit.slackbot({
  storage: botkit_mongo_storage
})


exports.controller = controller

//CONNECTION FUNCTIONS=====================================================
exports.connect = function(team_config){
  var bot = controller.spawn(team_config);
  controller.trigger('create_bot', [bot, team_config]);
}

// just a simple way to make sure we don't
// connect to the RTM twice for the same team
var _bots = {};

function trackBot(bot) {
  _bots[bot.config.token] = bot;
}

controller.on('create_bot',function(bot,team) {

  if (_bots[bot.config.token]) {
    // already online! do nothing.
    console.log("already online! do nothing.")
  }
  else {
    bot.startRTM(function(err) {
      if (!err) {
        trackBot(bot);
        console.log("RTM ok")
        controller.saveTeam(team, function(err, id) {
          if (err) {
            console.log("Error saving team")
          }
          else {
            console.log("Team " + team.name + " saved")
          }
        })
      }
      else{
        console.log("RTM failed")
      }
      //Introduce Scorebot to the user who added the bot
      bot.startPrivateConversation({user: team.createdBy},function(err,convo) {
        if (err) {
          console.log(err);
        } else {
          convo.say('I am Mr. Scorebot');
          convo.say('/invite me to a channel and I will award points to the coolest people in the office');
        }
      });
    });
  }
});

//REACTIONS TO EVENTS==========================================================

// Handle events related to the websocket connection to Slack
controller.on('rtm_open',function(bot) {
  console.log('** The RTM api just connected!');
});
controller.on('rtm_close',function(bot) {
  console.log('** The RTM api just closed');
  // you may want to attempt to re-open
});

//DIALOG ======================================================================


controller.hears('^stop','direct_message',function(bot,message) {
  bot.reply(message,'Goodbye');
  bot.rtm.close();
});

controller.hears(['set', '=', 'make (.*) equal', 'make (.*) worth'],'direct_message,direct_mention',function(bot,message) {
    console.log('Direct Mention:"set", sending to Converse.updateMedal:\n', message);
    Converse.updateMedal(bot, message);
});

controller.on('reaction_added,reaction_removed',function(bot,message) {
    console.log('Reaction from slack:', message);
    ScoreKeeper.analyze(bot, message);
});


var AllScoresText;

controller.hears(['my score', 'who is winning'],['ambient'],function(bot,message) {
  scoreboard.getAllScoresText(bot.team_info.id).then((text) => {
      console.log(text, "text stuff");
      AllScoresText = text;
      bot.startConversation(message, askToSeeScores);
  });
});

askToSeeScores = function(response, convo) {
  convo.ask("I am the keeper of the scores! \nDo you want to see everyone's score or just yours?", function(res, convo) {
    console.log("response", res);
    if(res.text.indexOf("everyone") > -1){
      convo.say("All I do is WIN WIN WIN :slack: :tada: :boom:");
      convo.say(AllScoresText);  
      console.log("getting all scores");
      convo.next();
    }
    else if(res.text.indexOf("me") > -1 || res.text.indexOf("my") > -1){
      scoreboard.getMyScore(res.user).then( (text) => {
        convo.say(text);
        console.log("the text", text);
        convo.next();
      });
    }
    else {
      convo.say("Alrighty! Goodbye");
      convo.next();
    }
    
    
    
  });
}







//setup each registered team
controller.storage.teams.all(function(err,teams) {
  console.log("============Registered Teams============");
  console.log(teams)
  console.log("============Registered Teams============");
  if (err) {
    throw new Error(err);
  }

  // connect all teams with bots up to slack!
  for (var t  in teams) {
    if (teams[t].bot) {
      var bot = controller.spawn(teams[t]).startRTM(function(err) {
        if (err) {
          console.log('Error connecting bot to Slack:',err);
        } else {
          trackBot(bot);
        }
      });
    }
  }

});
