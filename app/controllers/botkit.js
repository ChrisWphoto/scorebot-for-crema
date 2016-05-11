//CONFIG===============================================

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');
var Slacklete     = require('../models/slacklete');
var Medal         = require('../models/medal');
var ScoreKeeper   = require('./scoreKeeper');
var scoreboard    = require('../utils/scoreboard');
var Converse      = require('./converse');
var Officiator    = require('../utils/officiator')

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
          convo.say("you can also type `@mrscorebot help!`");
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

//set value of medal
controller.hears(['set', '=', 'make (.*) equal', 'make (.*) worth'],'direct_message,direct_mention',function(bot,message) {
    console.log('Direct Mention:"set", sending to Converse.updateMedal:\n', message);
    Converse.updateMedal(bot, message);
});

//show medals for this team
controller.hears(['show (.*) medals', 'show medals', 'show (.*) reactions', 'show (.*) emoji'],'direct_message,direct_mention',function(bot,message) {
    console.log('Direct Mention:"show medals\n', message);
    Officiator.getMedalValuesText(bot.team_info.id).then(function(text) {
        bot.reply(message, "\n" + text);
      });
});

//deal with reactions being added and removed
controller.on('reaction_added,reaction_removed',function(bot,message) {
    console.log('Reaction from slack:', message);
    ScoreKeeper.analyze(bot, message);
});

//introduce scorebot to the masses
controller.on('channel_joined',function(bot,message) {
    console.log('Channel Joined:', message);
    let introText = "Hey Thanks for the invite :smile:! I'm Mr. Scorebot I am now resident quantifier-of-social-status for your team."
    let helpText = "\nIf you wanna know what I do all day, ask me! `@Scorebot What do you do?` or maybe `@Scorebot HELP!?`"
    bot.say({
        text: introText + helpText,
        channel: message.channel.id //'C0H338YH4' // a valid slack channel, group, mpim, or im ID
      }
    );
});

//respond to cries for help
controller.hears(['what do you do', 'help', 'commands', 'features'],'direct_message,direct_mention',function(bot,message) {
    console.log('Direct Mention:"show medals\n', message);
    Converse.help(bot,message);
    
});


//declar var for storing pre-emptive call to db for teams scores
//sometimes async calls can cause the conversation to create a race condition. 
//Read more here about the issue https://github.com/howdyai/botkit/issues/20
var AllScoresText;

//Post the scoreboard to the channel 
controller.hears(['my score', 'who is winning'],['ambient'],function(bot,message) {
  scoreboard.getAllScoresText(bot.team_info.id).then((text) => {
      console.log(text, "text stuff");
      AllScoresText = text;
      bot.startConversation(message, askToSeeScores);
  });
});

askToSeeScores = function(response, convo) {
  convo.ask("Do you want to see everyone's score or just yours?", function(res, convo) {
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
