# Mr. Scorebot built with Botkit

Beta Scorebot built for http://Crema.us 

This app is live on https://crema-scorebot.herokuapp.com/
The authorization of Mr. Scorebot for the crema team can be accessed/changed via a slack admin account

Testing of botkit functionality is not easily implemented at this point. https://github.com/howdyai/botkit/issues/36



[Botkit Documentation](https://github.com/howdyai/botkit)


 
## Features

* Serves webpages through standard express routes
``` app/routes/routes.js ```

* Uses Mongoose as MongoDB driver
* Includes by default the three Botkit collections : Teams, Users, and Channels (not being used here)

## Configuration

First, [create a Slack app](https://api.slack.com/slack-apps).
You'll get your app ID and Secret, and you'll be able to enter authentication redirect URL. To be able to use the app both on a local machine and in cloud hosting, enter two URLs:
```
http://localhost:5000/
http://yourwebsite.com/
```

Then, you need to set up several environment variables before using this app.

* For local deployment

Create a .env file at the root of the project with the following infos (you can modify and rename the existing .env-example file:

```
SLACK_ID=your.id
SLACK_SECRET=yourslacksecret
SLACK_REDIRECT=http://localhost:5000/
PORT=5000
```

* For Heroku deployment

You need to add from the Heroku dashboard the SLACK_ID, SLACK_SECRET and SLACK_REDIRECT (set it to your website root).

You can use MongoLab add-on to add Mongo storage, they have a free tier.

## Licence
Shared under [MIT licence](http://choosealicense.com/licenses/mit/)
