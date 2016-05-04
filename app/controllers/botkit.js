//CONFIG===============================================

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');
var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/botkit_scorebot'
var botkit_mongo_storage = require('../../config/botkit_mongo_storage')({mongoUri: mongoUri})
var Slacklete     = require('../models/slacklete');
var Medal         = require('../models/medal');
var ScoreKeeper   = require('./scoreKeeper');


if (!process.env.SLACK_ID || !process.env.SLACK_SECRET || !process.env.PORT) {
  console.log('Error: Specify SLACK_ID SLACK_SECRET and PORT in environment');
  process.exit(1);
}

var controller = Botkit.slackbot({
  storage: botkit_mongo_storage
})
// .configureSlackApp({
//     clientId: process.env.SLACK_ID,
//     clientSecret: process.env.SLACK_SECRET,
//     redirectUri: 'https://mr-scorebot.herokuapp.com',
//     scopes: ['commands','incoming-webhook','team:read','users:read','channels:read','im:read','im:write','groups:read','emoji:read','chat:write:bot'],
//   });


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

      bot.startPrivateConversation({user: team.createdBy},function(err,convo) {
        if (err) {
          console.log(err);
        } else {
          convo.say('I am a bot that has just joined your team');
          convo.say('You must now /invite me to a channel so that I can be of use!');
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

controller.hears('hello','direct_message',function(bot,message) {
  bot.reply(message,'Hello!');
});

controller.hears('^stop','direct_message',function(bot,message) {
  bot.reply(message,'Goodbye');
  bot.rtm.close();
});

controller.on('direct_message,mention,direct_mention',function(bot,message) {
    console.log('message from mention:', message);
    // console.log("this is bot obj", bot.config.bot);
    ScoreKeeper.sendScores(bot,message);
    bot.reply(message,'I am a marmota bot.');
});

controller.on('reaction_added,reaction_removed',function(bot,message) {
    console.log('Reaction from slack:', message);
    ScoreKeeper.analyze(bot, message);
});


controller.on('slash_command',function(bot,message) {
  console.log('slash command msg', message);
  bot.replyPublic(message,'<@' + message.user + '> is cool!');
  bot.replyPrivate(message,'*nudge nudge wink wink*');

});

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
