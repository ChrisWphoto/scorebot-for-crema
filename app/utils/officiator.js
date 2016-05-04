var Medal = require('../models/medal');
var Q = require('q');

// Handles setting/saving Medals
module.exports = {
  slackSetMedal: function(text) {
    var deferred = Q.defer();
    this.parseText(text)
      .then(this.saveMedal, this.handleError)
      .then(function(medal) {
        var text = ":" + medal.reaction + ": is now worth *" + String(medal.value) + " points*"
        deferred.resolve(text);
      }).catch(this.handleError);
    return deferred.promise;
  },
  saveMedal: function(data) {
    var deferred = Q.defer();
    Medal.findOne({reaction: data.reaction}).then(function(medal) {
      if (medal) {
        medal.value = data.value;
      } else {
        medal = new Medal({
          reaction: data.reaction,
          value: data.value
        });
      }
      medal.save().then(function(medal) {
        deferred.resolve(medal);
      }, function (err) {
        deferred.reject(err);
      });
    }, function(err) {
      deferred.reject(err);
    });
    return deferred.promise;
  },
  parseText: function(text) {
    var deferred = Q.defer();

    var reaction = text.split("=")[0].replace(/ /g, '').replace(/:/g, '');
    var value    = parseInt(text.split("=")[1].replace(/ /g,''));
    if (reaction != "" && !isNaN(value)) {
      deferred.resolve({reaction: reaction, value: value});
    } else {
      deferred.reject("Couldn't parse text");
    }

    return deferred.promise;
  },
  getMedalValuesText: function() {
    var deferred = Q.defer();
    var officiator = this;

    Medal.find({}).then(function(medals) {
      var text = medals.sort(officiator.sortByValue).map(function(medal) {
        return ":" + medal.reaction + ": - `:" + medal.reaction + ":` *" +
          String(medal.value) + " points*";
      }).join("\n");
      deferred.resolve(text);
    });

    return deferred.promise;
  },
  sortByValue: function (a,b) {
    return b.value - a.value;
  },
  handleError: function(err) {
    console.log(err);
  }
}
