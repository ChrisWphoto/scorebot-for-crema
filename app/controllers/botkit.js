//CONFIG===============================================

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');
var Slacklete     = require('../models/slacklete');
var Medal         = require('../models/medal');
var ScoreKeeper   = require('./scoreKeeper');
var scoreboard    = require('../utils/scoreboard');
var Converse      = require('./converse');
var Officiator    = require('../utils/officiator');
var SlackAPI      = require('../utils/slackAPI');

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
          convo.say('I am Mr. Scorebot :robot_face:');
          convo.say('/invite me to a channel `/invite scorebot` and I will award points to the coolest people in the office!');
          convo.say("you can also type `@scorebot help!`");
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

/*
award points to all users mentioned + reactions
e.g. "@Jane :tada:" or ":+1: @Bob @billy"
(example msg form slack) text: 'asdasda <@U0KDPC4H2> :smile:',
note: (.*) matches any character except new line char.
*/
controller.hears('<@(.*)>(.*):(.*):|:(.*):(.*)<@(.*)>','ambient',function(bot,message) {
  console.log('Ambient from team:', message.team, 'msg text:', message.text );
  ScoreKeeper.awardPtsOnMention(bot,message);
});


//set value of medal
controller.hears(['set(.*):[^\s]+:', '=', 'make (.*) equal', 'make (.*) worth'],'direct_message,direct_mention',function(bot,message) {
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
    ScoreKeeper.reactionAdded(bot, message);
});

//reset scores of slackletes
controller.hears(['reset score', 'reset (.*) game', 'start over',],'direct_message,direct_mention',function(bot,message) {
  console.log('Direct Mention:"reset scores\n', message);
  Converse.resetScores(bot,message);    
});

//respond to cries for help
controller.hears(['why (.*) do', 'what (.*) do', 'whay are you here', 'features'],'direct_message,direct_mention',function(bot,message) {
  console.log('Direct Mention:"show medals\n', message);
  Converse.whatDoYouDo(bot,message);    
});

//Specifcally for Private message situation:Send help msg
controller.hears(['help'],'direct_message',function(bot,message) {
  console.log('Direct Mention:"HELP\n', message);
  Converse.commands(bot,message);
  bot.reply(message, "Note: I only listen on channels in which I am inivted. `/invite scorebot`");    
});

//Send scorebot commands
controller.hears(['commands', 'command', 'comand',  , 'comands', 'orders','instructions','documentation'],'direct_message,direct_mention',function(bot,message) {
  console.log('Direct Mention:"commands\n', message);
  Converse.commands(bot,message);    
});

//respond to both real and imagined insults to scorebots integrity
controller.hears(['WTF', 'WTH', 'damn', 'fuck', 'shit', 'dumb', 'stupid', 'hell'],'direct_message,direct_mention',function(bot,message) {
  console.log('Scorebot thinks he was insulted\n', message);
  SlackAPI.getUserInfo(message.user, bot.config.bot.token).then( ({user}) =>{
    bot.reply(message, "Tread carefully " + user.name + " I may only be a simple scorebot but our robotic overloads are coming... :smiling_imp: :robot_face: :smiling_imp:" )  
  });     
});

//introduce scorebot to the masses
controller.on('channel_joined',function(bot,message) {
  console.log('Channel Joined:', message);
  let introText = "Hey Thanks for the invite :smile:! I am now resident quantifier-of-social-status for your team."
  let helpText = "If you wanna know what I do, ask me! `@scorebot What do you do?` or maybe `@scorebot commands?`"
  bot.say({
    text: introText,
    channel: message.channel.id //'C0H338YH4' // a valid slack channel or group
    }
  );
  bot.say({
    text: helpText,
    channel: message.channel.id 
    }
  );
});

//Post users score to the channel 
controller.hears(['my score','myscore', 'my level','my points','my karma','have points'],'direct_mention,direct_message',function(bot,message) {
  console.log('@scorbot: myscore:\n', message);
  ScoreKeeper.getMyScore(bot,message);
});

//Post whole scoreboard to the channel 
controller.hears(['who is in first','winning','on top','place'],'direct_mention,direct_message',function(bot,message) {
  ScoreKeeper.getLeaderBoard(bot, message);
});

/* This should be the last listener! */
//Default reply for scorebot - No thing above matched 
controller.on('direct_mention,direct_message',function(bot,message) {
    console.log('Default Reply by scorebot:\n', message);
    bot.reply(message, "Sorry! I can be dumb sometimes :frowning: `@scorebot commands` shows what I can do" );
});







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
