var mongoose       = require('mongoose');
var Schema         = mongoose.Schema;
var io             = require('socket.io')();
var Q              = require('q');
var Slacklete      = require('./slacklete');
var SlackleteNamer = require('../lib/slackleteNamer');

var scoreSchema = new Schema({
  slacklete_id: String,
  score: Number
});

var archiveSchema = new Schema({
  scores: [scoreSchema],
  range_start: Date,
  range_end: Date
});

archiveSchema.methods.toSlackText = function() {
  var deferred = Q.defer();
  var archive = this;
  var json = archive.toObject();
  SlackleteNamer.insertNameInto(archive.scores).then(function(scores) {
    json.scores = scores;
    var text = "**Here are the scores from " + archive.range_start.toDateString() +
      " to " + archive.range_end.toDateString() + "\n";
    json.scores.map(function(slacklete) {
      text+= "\n**" + slacklete.name + "**: " + slacklete.score;
    });
    deferred.resolve(text);
  });
  return deferred.promise;
}


var ScoresArchive = mongoose.model('ScoresArchive', archiveSchema);

module.exports = ScoresArchive;
