"use strict";

var Medal         = require('../models/medal');
var Slacklete     = require('../models/slacklete');
var SlackAPI      = require('../utils/slackAPI');
var Controller    = require('./botkit');
var Scoreboard    = require('../utils/scoreboard');

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
 */
function addNewUser( msg, bot, medal ){
  console.log("adding new slacklete:", msg.item_user, bot.config.bot.token);
  SlackAPI.getUserInfo(msg.item_user, bot.config.bot.token)
    .then( slackUserData => saveUserToDb(slackUserData, msg, medal, bot), 
           reject => console.log('Error saving new slacklete:', reject) );
};

function saveMedalToDb( reaction, bot  ) {
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
  return msg.text.match(/:[^\s]+:/g)
    .map( reaction => reaction.substring(1, reaction.length -1) );
};


/*
Note: Slack API Token is at bot.config.bot.token
      Team Name is at bot.team_info.id
*/

// Calculates and delegates scores
var ScoreKeeper = {
  
  /* 
    Takes msg of type reaction_added
    Saves medal to db if new
    Saves user to db if new after looking up real name on slack api  
   */
  reactionAdded: function(bot, msg) {
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
        saveMedalToDb(msg.reaction, bot).then( newMedal => {
          console.log("newMedal found:", newMedal.reaction);
          //See if the person who received medal exists in db
          query.findOne({slack_id: author}).then( slacklete => {
            //check if slacklete exists
            if (slacklete) {
              console.log('slacklete ' + slacklete.slack_id + ' found');
              updateScore(slacklete, msg, newMedal);
            } else { //user not found, creating user...
                console.log('Saving new Slacklete');
                //Save user and update their score
                addNewUser(msg, bot, newMedal);
              }
            });  
        });
      }
    });
  },
  
  /*
  Award points when user is mentioned in same sentence as reaction.
  If new reactions are used add them to the DB with a random value
  If new user is mentioned, add them to the DB with a radnomd value
  The next time that reaction is used the saved medal value will be used
  
  (example msg form slack) text: '<@U0KDPC4H2>: <@ASDADASDA> you are awesome :tada: :+1:',
  */
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
      .exec( (err, medalResults) => {
          if (err) { console.log(err); return;}
          console.log("awardPtsOnMention reactions in db: \n", medalResults);
          //save medals that are not currently in db 
          //Note: the value of these new medals will not be awarded this time round
          checkNewMedalsAndSave(reactionsArray,medalResults,bot);
          let totalPts = medalResults.map(obj => obj.value)
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
              //
              checkNewSlackletesAndSave(userIdArray,slackletes,bot);
            });
      });
  },
  
  /**
   Get user score but first check if we need to welcome them to the game. 
   */
  getMyScore: function(bot,msg) {
    Slacklete.findOne({slack_id: msg.user})
      .then( (slacklete) => {
        if (slacklete) { //usr exists in db
          let yourScoreText = slacklete.name +", your level of win is: :tada: *" + slacklete.score + "* :tada:";
          bot.reply(msg, yourScoreText);
        } 
        else { //User does not exist in DB
          bot.reply(msg, "Hmmm... I don't see you in my leaderboard of social standing. Let's fix that...");
          //we are going to add a reaction to their message which will add them to the db automatically
          //via the reactionAdded() function
          addReactAndWelcomeUser(bot,msg);
        }
      });
  },
  
  //get leaderboard but first check if we need to welcome them to the game.
  getLeaderBoard: function(bot,msg){
    Scoreboard.getAllScoresText(bot.team_info.id)
      .then(
        (leaderBoardText) => {
        bot.reply(msg,"All I do is WIN WIN WIN :slack: :tada: :boom:");
        bot.reply(msg,leaderBoardText);
      })
      .catch( (NoLeaderBoardReject) => {
        bot.reply(msg, "Hmm... The leaderboard of social standing does exists yet, let's fix that...");
        addReactAndWelcomeUser(bot,msg);
      })
  }     
}

//adds a reaction to a user who have never gotten one before
function addReactAndWelcomeUser(bot,msg) {
  setTimeout( () => {
            bot.api.reactions.add({
              timestamp: msg.ts,
              channel: msg.channel,
              name: 'star2',
            },function(err) {
              if (err) {
                console.log('GetmyScore: err adding reaction', err); 
                bot.reply(msg, "oops, nvm I done goofed... :flushed:");
                return;
              } else {
                setTimeout( () => {
                  bot.reply(msg, "There we go! You've been given you're first medal. :star2: let the Games Begin!");
                  bot.reply(msg, "`@scorebot my score` will work now too");  
                }, 1500);  
              }
            });  
          }, 1500 );
}


//filter out slackers that are already in DB
function checkNewSlackletesAndSave(userIdArray, usersInDB, bot){
  if (userIdArray.length == usersInDB.length) return;
  let slackletesToSave = userIdArray.filter( userId => {
      var keep = true;
      usersInDB.forEach( userInDB => {
        if (userInDB.slack_id == userId)
          keep = false;
      })
      return keep; 
    });
    console.log('New Slackletes who will be saved', slackletesToSave);
    saveNewSlackletes(slackletesToSave, bot);   
};
//Get user info from slack api and save them to DB
function saveNewSlackletes(slackletesToSave, bot){  
  let slackApiCalls = slackletesToSave.map( slackID => {
    return SlackAPI.getUserInfo(slackID, bot.config.bot.token); 
  });
  let newSlackletes = [];
  //execute calls to slack API
  Promise.all(slackApiCalls)
    .then(
      (userArray) => {
        userArray.map( ({user}) => {
          newSlackletes.push(
            {
              score: Math.ceil(25 * Math.random()), //rand val between 1 & 25,
              slack_id: user.id,
              name: user.real_name ? user.real_name : user.name,
              team_id: bot.team_info.id,
              team_name: bot.team_info.name 
            })  
          });
          Slacklete.collection.insert(newSlackletes, (err, docs) => {
            if (err) console.log('Error saving new slackletes:',err);
            console.log('returned new collection.insert slackletes',docs);
          }),
      (err) => console.log('promise.all',err)
      }
    );   
};


//take array of reaction names and check if there are any new ones
function checkNewMedalsAndSave(reactionsArray, reactionsAlrdyInDB, bot){
  return new Promise( (resolve, reject) => {
    if (reactionsArray.length == reactionsAlrdyInDB.length){
      resolve('No medals to save');
    }  
    let reactionsToSave = reactionsArray.filter( reactName => {
      var keep = true;
      reactionsAlrdyInDB.forEach( reactInDB => {
        if (reactInDB.reaction == reactName)
          keep = false;
      })
      return keep; 
    });
    //push all these new reaction to the db with random values between 1-25
    let medalArray = [];
    reactionsToSave.forEach(reaction => medalArray.push(
      {
        reaction: reaction, 
        value: Math.ceil(25 * Math.random()), //rand val between 1 & 25
        team_id: bot.team_info.id
      }
     )
    );
    console.log('medalArray', medalArray);
    Medal.collection.insert(medalArray, (err, docs) =>{
      if (err){console.log("error insertMany", err); reject(err);} 
      console.log('Docs returned form insert many', docs);
      resolve("medals saved");  
    })  
  })
  .catch( err => console.log('Error saving new medals to DB', err) );    
};


module.exports = ScoreKeeper;

