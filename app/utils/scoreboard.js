var Slacklete = require('../models/slacklete');
var Q = require('q');

// Collects and displays scores
module.exports = {
  getAllScoresText: function(teamID) {
    var deferred = Q.defer();

    this.getAllScores(teamID).then(function(slackletes) {
      var text = slackletes.map(function(slacklete) {
          return "*" + slacklete.name + "*: " + slacklete.score;
        }).join("\n");
      deferred.resolve(text);
    }, function(err) {
      deferred.reject(err)
    })
    return deferred.promise;
  },
  getAllScores: function(teamID) {
    var scoreboard = this;
    var deferred = Q.defer();
    Slacklete.find({team_id: teamID}).then(function(slackletes) {
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
        deferred.resolve("Your level of win is: :tada: *" + slacklete.score + "* :tada:");
      } else {
        deferred.reject("No slacklete found with that ID :frowning:");
      }
    });
    return deferred.promise;
  },
  sortByScore: function (a,b) {
    return b.score - a.score;
  }
}
