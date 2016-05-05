var express    = require('express');
var router     = express.Router();
var Slacklete  = require('../models/slacklete');
var Scoreboard = require('../utils/scoreboard');
var Officiator = require('../utils/officiator');


/* GET users listing. */
router.post('/', function(req, res, next) {
  console.log("req.body from slash route / \n", req.body);
  if (req.body.token != process.env['SLACK_SLASH_TOKEN']) {
    return res.process(401).send({erro: "Slash command token doesn't match"});
  }
  var text = req.body.text;
  var user = req.body.user_id;
  var user_name = req.body.user_name;
  var channel = "";

  // // `:reaction: = 100` - set score of medal
  // if (text.split("=").length > 1 && text.indexOf(":") > -1) {
  //   return Officiator.slackSetMedal(text).then(function(text) {
  //     channel.send("@" + user_name + " is a game-changer: " + text);
  //       res.status(200).send(text);
  //   });
  // }

  switch (text.replace(/ /g,'').toLowerCase()) {
    case "me":
      // Return score in response for slackbot to report (private)
      return Scoreboard.getMyScore(user).then(function(text) {
        res.status(200).send(text);
      }, function(text) {
        res.status(400).send(text);
      });
    case "medals":
      // Return medals in response for slackbot to report (private)
      return Officiator.getMedalValuesText().then(function(text) {
        res.status(200).send("\n"+text);
      });
    case "announce":
      // Have Scorebot post in the channel (public to channel)
      return Scoreboard.getAllScoresText().then(function(text) {
        channel.send("Here are the latest scores:\n" + text);
        res.status(200).send();
      }, function(text) {
        res.status(400).send(text);
      });
    case "archive":
      return ScoreKeeper.archive().then(function(archive) {
        archive.toSlackText().then(function(text) {
          channel.send(text);
          res.status(204).send();
        });
      })
    default:
      // Return scores in response for slackbot to report (private)
      return Scoreboard.getAllScoresText().then(function(text) {
        console.log("res from getallscores\n", res);
        console.log("res.body from getallscores \n", res.body);
        res.status(200).send("Here are the latest scores:\n" + text);
      }, function(text) {
        res.status(400).send(text);
      });
  }
});

module.exports = router;
