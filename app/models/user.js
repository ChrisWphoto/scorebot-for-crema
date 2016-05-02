var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
  id            : String,
  access_token  : [],
  team_id       : String,
  user          : String 
});

var User = mongoose.model('User', schema);

module.exports = User;

//Example User Document
/*
"id" : "U0KDPC4H2",
	"access_token" : "xoxp-19470580754-19465412580-37532766689-6cf767944b",
	"scopes" : [
		"identify",
		"bot"
	],
	"team_id" : "T0KDUH2N6",
	"user" : "cgwcnc"
*/ 