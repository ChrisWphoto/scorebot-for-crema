var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var schema = new Schema({
  name: String,
  slack_id: String,
  score: Number
});

schema.methods.award = function(points) {
  this.score = (this.score || 0) + points;
  this.save(function(err, slacklete) {
    if (err) {console.log('err', err); return}
    io.emit('score:award', {slacklete: slacklete});
  });
}
schema.methods.revoke = function(points) {
  this.score = (this.score || 0) - points;
  this.save(function(err, slacklete) {
    if (err) {console.log('err', err); return}
    io.emit('score:revoke', {slacklete: slacklete});
    console.log(slacklete.name + ': ' + slacklete.score);
  });
}
schema.methods.resetScore = function() {
  this.score = 0;
  this.save(function(err, slacklete) {
    if (err) {console.log('err', err); return err}
    io.emit('score:reset', {slacklete: slacklete});
  });
}

var Slacklete = mongoose.model('Slacklete', schema);

module.exports = Slacklete;
