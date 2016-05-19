var Request          = require('request')
var slack           = require('../controllers/botkit')

// frontend routes =========================================================
module.exports = function(app) {

  //public pages=============================================
  //root
  app.get('/', function(req, res) {
    console.log("root")

    res.render('root', {installed: ""}); // load view/root.html file
  });

  //new user creation - redirection from Slack
  app.get('/new', function(req, res) {
    console.log("================== START TEAM REGISTRATION ==================")
    //temporary authorization code
    var auth_code = req.query.code

    if(!auth_code){
      //user refused auth
      console.log('user refused auth');
      res.redirect('/')
    }
    else{
      console.log("New user auth code " + auth_code)
      perform_auth(auth_code, res)
    }
  })

  //CREATION ===================================================

  var perform_auth = function(auth_code, res){
    //post code, app ID, and app secret, to get token
    var auth_adresse = 'https://slack.com/api/oauth.access?'
    auth_adresse += 'client_id=' + process.env.SLACK_ID
    auth_adresse += '&client_secret=' + process.env.SLACK_SECRET
    auth_adresse += '&code=' + auth_code
    auth_adresse += '&redirect_uri=' + process.env.SLACK_REDIRECT + "new"

    Request.get(auth_adresse, function (error, response, body) {
      if (error){
        console.log(error)
        res.sendStatus(500)
      }

      else{
        var auth = JSON.parse(body)
        console.log("New user auth")
        console.log(auth)

        register_team(auth,res)
      }
    })
  }
  //this takes the slack button request and registers the team
  var register_team = function(auth, res){
    //first, get authenticating user ID
    var url = 'https://slack.com/api/auth.test?'
    url += 'token=' + auth.access_token

    Request.get(url, function (error, response, body) {
      if (error){
        console.log(error)
        res.sendStatus(500)
      }
      else{
        //take the response from slack and save the team
        try{
          var identity = JSON.parse(body)
          console.log(identity)

          var team = {
            id: identity.team_id,
            bot:{
              token: auth.bot.bot_access_token,
              user_id: auth.bot.bot_user_id,
              createdBy: identity.user_id
            },
            createdBy: identity.user_id,
            url: identity.url,
            name: identity.team
          }
          startBot(team)
          res.render('root', {installed: "Successfully Installed!"})

          saveUser(auth, identity)
        }
        catch(e){
          console.log(e)
        }
      }
    })
  }

  var startBot = function(team){
    console.log(team.name + " start bot")

    slack.connect(team)
  }

  //register the user that clicked the slack button
  var saveUser = function(auth, identity){
    // what scopes did we get approved for?
    var scopes = auth.scope.split(/\,/);
    console.log("Auth we returned", auth);

    slack.controller.storage.users.get(identity.user_id, function(err, user) {
      isnew = false;
      if (!user) {
          isnew = true;
          user = {
              id: identity.user_id,
              access_token: auth.access_token,
              scopes: scopes,
              team_id: identity.team_id,
              user: identity.user,
          };
      }
      //pass the data above to storage module and save user
      slack.controller.storage.users.save(user, function(err, id) {
        if (err) {
          console.log('An error occurred while saving a user: ', err);
          slack.controller.trigger('error', [err]);
        }
        else {
          if (isnew) {
            console.log("New user " + id.toString() + " saved");
          }
          else {
            console.log("User " + id.toString() + " updated");
          }
          console.log("================== END TEAM REGISTRATION ==================")
        }
      });
    });
  }
}
