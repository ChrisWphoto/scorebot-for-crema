/*
  Create own datbase for slackletes

  Check if user exists
    if user exists
      add score based on which emoticon was used

    else user not found
      ask api/users.info for user info
      add user to database and set score
*/
"use strict";

var Medal         = require('../models/medal');
var Slacklete     = require('../models/slacklete');
var SlackAPI      = require('../slackAPI/slackAPI');
var Controller    = require('./botkit');

//private function for updating score
var updateScore = function(user, points) {
  if (event.type == 'reaction_added') {
    user.award(points);
  } else if (event.type == 'reaction_removed') {
    console.log('revoke');
    user.revoke(points);
  }
};

//get user info form slack
var addNewUser = function(slack_id, token){
  console.log("adding new:", slack_id, token);
  SlackAPI.getUserInfo(slack_id, token)
    .then( resolve => {
      let user = resolve.user;
      console.log('userInfo.user from slack:', user);
      var newUser = new Slacklete({
        slack_id: user.id,
        name: user.real_name != '' ? user.real_name : user.name
      });
      newUser.save(err => {
        err ? console.log(err) : console.log('Added Slacklete:', slack_id)
      });
    },
    reject => console.log('Error saving new slacklete:', reject)
  );
}


// Calculates and delegates scores
var ScoreKeeper = {
  analyze: function(msg, bot) {


    //find the medal for given reaction
    Medal.findOne({reaction: msg.reaction}).then(function(medal) {
      if (medal) {
        //get author of original post
        var author = msg.item_user;
        var query = Slacklete.where({ slack_id: author });
        query.findOne({slack_id: author}).then(function(slacklete) {
          //check if slacklete exists
          if (slacklete) {
            console.log('slacklete ' + slacklete.slack_id + ' found');
          } else {
            console.log('New Slacklete Found Saving...');
            //pass slack_id and slack token for that team
            addNewUser(author, bot.config.bot.token);
          }
        });
      }
    });
  },

  sendScores: function(msg, bot) {
    Slacklete.find({}).then(function(slackletes) {

      bot.reply(msg, "```" + slackletes.toString() + "```" );
    });
  }


}

module.exports = ScoreKeeper;
