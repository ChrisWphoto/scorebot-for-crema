var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
  reaction: String,
  value: Number
});

var Medal = mongoose.model('Medal', schema);

module.exports = Medal;
