var Slacklete = require('../models/slacklete');
var Q = require('q');

// Collects and displays scores
module.exports = {
  getAllScoresText: function() {
    var deferred = Q.defer();

    this.getAllScores().then(function(slackletes) {
      var text = slackletes.map(function(slacklete) {
          return "*" + slacklete.name + "*: " + slacklete.score;
        }).join("\n");
      deferred.resolve(text);
    }, function(err) {
      deferred.reject(err)
    })
    return deferred.promise;
  },
  getAllScores: function() {
    var scoreboard = this;
    var deferred = Q.defer();
    Slacklete.find({}).then(function(slackletes) {
      if (slackletes.length) {
        deferred.resolve(slackletes.sort(scoreboard.sortByScore));
      } else {
        deferred.reject("No Slackletes exist yet :pensive:");
      }
    }, function(err) {
      deferred.reject(err);
    });
    return deferred.promise;  
  },
  getMyScore: function(user) {
    var deferred = Q.defer();
    Slacklete.findOne({slack_id: user}).then(function(slacklete) {
      if (slacklete) {
        deferred.resolve("Your score is " + slacklete.score);
      } else {
        deferred.reject("No slacklete found with that ID");
      }
    });
    return deferred.promise;
  },
  sortByScore: function (a,b) {
    return b.score - a.score;
  }
}
