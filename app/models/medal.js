var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
  reaction: String,
  value: Number,
  team_id: String
});

var Medal = mongoose.model('Medal', schema);

module.exports = Medal;
