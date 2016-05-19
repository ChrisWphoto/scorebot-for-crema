/*
helper module for requesting data from slack
using axios: https://github.com/mzabriskie/axios
*/
"user strict";
var axios = require('axios');

//api url
const SLACK_URL = 'https://slack.com/api';

var methods = {
  
  deleteSlackMsg: (token, timestamp, channel) => {
    return new Promise( (resolve, reject) => {
      axios.get(SLACK_URL + '/chat.delete', {
        params: {
          token: token,
          ts: timestamp,
          channel: channel
        }
      })
      .then( (res) => {
        if (!res.ok) reject(res.data);
        console.log(res.data);
        resolve(res.data);
      })
    })
  },
  
  findLastScorebotMsg: (bot, msg) => {
    return new Promise( (resolve,reject) => {
      axios.get(SLACK_URL + '/channels.history', {
        params: {
          token: bot.config.bot.token,
          channel: msg.channel,
          count: 7
        }
      })
      .then( (res) => {
        console.log(res.data);
        //let msgToDel = res.data.messages.filter( (msg) => msg.user === bot.config.bot.user_id );
        //deleteSlackMsg(bot.config.bot.token, msgToDel[0].ts , msg.channel)
        //.then(res => console.log(res))
      })
      .catch(res => console.error("error deleting msgs", res));
    });
  },
  
  getUserInfo: (slack_id, token) => {
    console.log('getUserInfo:', slack_id, token);
    return new Promise( (resolve, reject) => {
      axios.get(SLACK_URL +'/users.info', {
        params: {
          token: token,
          user: slack_id
        }
      })
      .then( res => {
        console.log("SlackAPI returned user:", res.data.user.name); 
        resolve(res.data); 
      }); 
        
    })
  },

  getTeamToken: (slack_id,cb) =>
    new Promise( (resolve, reject) => {
      storage.users.get(slack_id, (err, userInfo) =>{
        if (err) reject(err);
        console.log('userInfo!', userInfo);
        resolve(userInfo);
      })
    })

}


module.exports = methods;
