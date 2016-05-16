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

function saveMedalToDb( {reaction}, bot  ) {
  return new Promise( (resolve, reject) => {
    let newMedal = new Medal({
      reaction: reaction, 
      value: Math.ceil(25 * Math.random()), //rand val between 1 & 25
      team_id: bot.team_info.id
    });
    newMedal.save(err => {
      if (err) reject(err);
      else {
        console.log('Added Medal:', reaction)
        resolve(newMedal);
      }
    });  
  });
};

function logErr(msg, err) {
  console.log(msg,err)
};

//get 1 or more users and strip off special characters
//(example msg) 'asdasda <@U0KDPC4H2> :smile:'
function getUserIdArray(msg){
  return msg.text.match(/<@(\w+|\d+)>/g)
    //now turn <@U0KDPC4H2> => U0KDPC4H2
    .map( userId =>  userId.match(/\d+|\w+/g)[0] );
    
};

//get 1 or more reactions and strip off special characters
function getReactionArray(msg){
  return msg.text.match(/:\w+:/g)
    .map( reaction => reaction.substring(1, reaction.length -1) );
};


/*
Note: Slack API Token is at bot.config.bot.token
      Team Name is at bot.team_info.id
*/

// Calculates and delegates scores
var ScoreKeeper = {
  
  analyze: function( bot, msg ) {
    //get author of original post
    let author = msg.item_user;
    let query = Slacklete.where({ slack_id: author });
    
    //find the medal for given reaction
    let medalData = {reaction: msg.reaction, team_id: bot.team_info.id};
    Medal.findOne( medalData ).then( medal => {
      if (medal) { //we have found a medal!
        query.findOne({slack_id: author}).then(function(slacklete) {
          //check if slacklete exists
          if (slacklete) {
            console.log('slacklete ' + slacklete.slack_id + ' found');
            updateScore(slacklete, msg, medal);
          } else { //user not found, creating user...
              console.log('New Slacklete Found Saving...');
              //Save user and update their score
              addNewUser(msg, bot, medal);
            }
        });
      } else { //We did not find a existing medal for that team :(
        saveMedalToDb(msg, bot).then( newMedal => {
          console.log("newMedal found:", newMedal.reaction);
          //See if the person who received medal exists in db
          query.findOne({slack_id: author}).then( slacklete => {
            //check if slacklete exists
            if (slacklete) {
              console.log('slacklete ' + slacklete.slack_id + ' found');
              updateScore(slacklete, msg, newMedal);
            } else { //user not found, creating user...
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

  /*
  Award points when user is mentioned in same sentence as reaction
  e.g. @Jane :tada:  or :+1: @Bob
  (example msg form slack) text: 'asdasda <@U0KDPC4H2> :smile:',
  */
  // TODO / NOTE: this function does not create new medals or users it only operates on existing ones. 
  awardPtsOnMention: function(bot,msg){
    let reactionsArray = getReactionArray(msg);
    let userIdArray = getUserIdArray(msg);
    console.log('awardPtsOnMention: arrays:\n',reactionsArray, "\n", userIdArray);
    let findTheseReactions = [];
    reactionsArray.forEach( reactName => findTheseReactions.push({reaction: reactName }) );
    //find all the medals used in msg
    Medal.find()
      .and([
          { team_id: msg.team },
          { $or: findTheseReactions }  
      ])
      .exec( (err, results) => {
          if (err) { console.log(err); return;}
          console.log("awardPtsOnMention reactions in db: \n", results, "\n");
          //sum up all the points we got back
          let totalPts = results.map(obj => obj.value)
            .reduce( (prev,curr) => prev + curr, 0 );
          console.log(totalPts);
          //go find the slackletes who were mentioned and give all of them points
          Slacklete.find()
            .or( {slack_id: {"$in":userIdArray} })
            .exec( (err, slackletes) => {
              if (err) { console.log(err); return;}
              console.log("awardPtsOnMention Users in db: \n", slackletes, "\n");
              //give them all points! 
              slackletes.forEach( slacker => slacker.award(totalPts));
            });
      });
  }
  
}




module.exports = ScoreKeeper;

