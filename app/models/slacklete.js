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
  });
}
schema.methods.revoke = function(points) {
  this.score = (this.score || 0) - points;
  this.save(function(err, slacklete) {
    if (err) {console.log('err', err); return}
    console.log(slacklete.name + ': ' + slacklete.score);
  });
}
schema.methods.resetScore = function() {
  this.score = 0;
  this.save(function(err, slacklete) {
    if (err) {console.log('err', err); return err}
  });
}

var Slacklete = mongoose.model('Slacklete', schema);

module.exports = Slacklete;
