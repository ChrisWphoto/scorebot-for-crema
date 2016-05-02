var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
  id : String,
  bot : {
		token     : String,
		user_id   : String,
		createdBy : String
	},
  createdBy : String,
  url       : String,
  name      : String,
  token     : String 
});

var Team = mongoose.model('Team', schema);

module.exports = Team;

//Example Team Record
/*
"id" : "T0KDUH2N6",
	"bot" : {
		"token" : "xoxb-37527993493-LKoOzpatiGoJzz9zmrdce4KC",
		"user_id" : "U13FHV7EH",
		"createdBy" : "U0KDPC4H2"
	},
	"createdBy" : "U0KDPC4H2",
	"url" : "https://slashingtesting.slack.com/",
	"name" : "slashingTesting",
	"token" : "xoxb-37527993493-LKoOzpatiGoJzz9zmrdce4KC"
*/ 