"use strict";

var Medal         = require('../models/medal');
var Slacklete     = require('../models/slacklete');
var SlackAPI      = require('../utils/slackAPI');
var Controller    = require('./botkit');

//Helper Functions for analyze method --->

function updateScore( slacklete, {type}, {value} ) {
  if (type == 'reaction_added') {
      console.log(slacklete.name, "Awarded", value);
      slacklete.award(value);
  } 
  else if (type == 'reaction_removed') {
    console.log(slacklete.name, "Lost", value);
    slacklete.revoke(value);
  }
};

function saveUserToDb( {user}, msg, medal ){
  var newUser = new Slacklete({
    slack_id: user.id,
    name: user.real_name ? user.real_name : user.name
  });
  newUser.save( err => {
    if (err){ console.log(err); return;}
    console.log('Added Slacklete:', user.id, user.name);
    if (medal) updateScore(newUser, msg, medal);
  });
};

/**
 * Get slackletes info from slack api 
 * then call saveUserToDb()
 *
 * @param {Object} msg
 * @param {String} token
 * @param {Object} medal
 * @return void
 */
function addNewUser( msg, token, medal ){
  console.log("adding new slacklete:", msg.item_user, token);
  SlackAPI.getUserInfo(msg.item_user, token)
    .then( data => saveUserToDb(data, msg, medal), 
           reject => console.log('Error saving new slacklete:', reject) );
};

function saveMedalToDb( {reaction} ) {
  let newMedal = new Medal({reaction: reaction, value: 5});
  newMedal.save(err => {
    err ? console.log(err) : console.log('Added Medal:', reaction)
  });
}

// Calculates and delegates scores
var ScoreKeeper = {
  
  analyze: function( bot, msg ) {
    //find the medal for given reaction
    Medal.findOne( {reaction: msg.reaction} ).then( function(medal ) {
    if (medal) {
      //get author of original post
      let author = msg.item_user;
      let query = Slacklete.where({ slack_id: author });
      query.findOne({slack_id: author}).then(function(slacklete) {
        //check if slacklete exists
        if (slacklete) {
          console.log('slacklete ' + slacklete.slack_id + ' found');
          updateScore(slacklete, msg, medal);
        } else {
            console.log('New Slacklete Found Saving...');
            //Save user and update their score
            addNewUser(msg, bot.config.bot.token, medal);
          }
      });
    } else {
      saveMedalToDb(msg);
    }
    });
  },

  //For testing, send all slackletes on direct mention of bot
  sendScores: function(bot, msg) {
    Slacklete.find({}).then(function(slackletes) {
      bot.reply(msg, "```" + slackletes.toString() + "```" );
    });
  }
  
}

module.exports = ScoreKeeper;
