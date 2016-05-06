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

function saveUserToDb( {user}, msg, medal, bot ){
  var newUser = new Slacklete({
    slack_id: user.id,
    name: user.real_name ? user.real_name : user.name,
    team_id: bot.team_info.id,
    team_name: bot.team_info.name
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
function addNewUser( msg, bot, medal ){
  console.log("adding new slacklete:", msg.item_user, bot.config.bot.token);
  SlackAPI.getUserInfo(msg.item_user, bot.config.bot.token)
    .then( slackUserData => saveUserToDb(slackUserData, msg, medal, bot), 
           reject => console.log('Error saving new slacklete:', reject) );
};

function saveMedalToDb( {reaction} ) {
  return new Promise( (resolve, reject) => {
    let newMedal = new Medal({reaction: reaction, value: 10});
    newMedal.save(err => {
      if (err) reject(err);
      else {
        console.log('Added Medal:', reaction)
        resolve(newMedal);
      }
    });  
  });
};
/*
Note: Slack API Token is at bot.config.bot.token
      Team Name is at bot.team_info.id
*/
function logErr(msg, err) {console.log(msg,err)}

// Calculates and delegates scores
var ScoreKeeper = {
  
  analyze: function( bot, msg ) {
    
    //get author of original post
    let author = msg.item_user;
    let query = Slacklete.where({ slack_id: author });
    
    //find the medal for given reaction
    Medal.findOne( {reaction: msg.reaction} ).then( medal => {
    if (medal) {
      query.findOne({slack_id: author}).then(function(slacklete) {
        //check if slacklete exists
        if (slacklete) {
          console.log('slacklete ' + slacklete.slack_id + ' found');
          updateScore(slacklete, msg, medal);
        } else {
            console.log('New Slacklete Found Saving...');
            //Save user and update their score
            addNewUser(msg, bot, medal);
          }
      });
      } else {
        saveMedalToDb(msg).then( newMedal => {
          console.log("newMedal found:", newMedal.reaction);
          query.findOne({slack_id: author}).then( slacklete => {
          //check if slacklete exists
          if (slacklete) {
            console.log('slacklete ' + slacklete.slack_id + ' found');
            updateScore(slacklete, msg, newMedal);
          } else {
              console.log('New Slacklete Found Saving...');
              //Save user and update their score
              console.log("\n\nbot config: ", bot.config.bot, "\n\n");
              addNewUser(msg, bot, newMedal);
            }
          });  
        });
      }
    });
  },

  //For testing, send all slackletes on direct mention of bot
  sendScores: function(bot, msg) {
    Slacklete.find({}).then(function(slackletes) {
      bot.reply(msg, "Hey What's up?" );
    });
  }
  
}

module.exports = ScoreKeeper;

