var express   = require('express');
var router    = express.Router();
var Slacklete = require('../models/slacklete');

/* GET users listing. */
router.get('/', function(req, res, next) {
  Slacklete.find({}).then(function(slackletes) {
    res.status(200).send(slackletes);
  }, function (err) {
    res.status(500).send({error: err})
  })
});

/* GET users listing. */
router.post('/', function(req, res, next) {
  Slacklete.find({}).then(function(slackletes) {
    res.status(200).send(slackletes);
  }, function (err) {
    res.status(500).send({error: err})
  })
});


router.get('/:id', function(req, res, next) {
  Slacklete.findOne({slack_id: req.params.id}).then(function(slacklete) {
    if (slacklete) {
      res.status(200).send(slacklete);
    } else {
      res.status(404)
        .send({error: "User not found with slack_id " + req.params.id});
    }
  }, function (err) {
    res.status(500).send({error: err})
  })
});

module.exports = router;
