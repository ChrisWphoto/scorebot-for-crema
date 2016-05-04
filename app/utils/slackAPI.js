/*
helper module for requesting data from slack
using axios: https://github.com/mzabriskie/axios
*/
var axios = require('axios');

//api url
const SLACK_URL = 'https://slack.com/api';

var methods = {

  getUserInfo: (slack_id, token) =>
    new Promise( (resolve, reject) => {
      axios.get(SLACK_URL +'/users.info', {
        params: {
          token: token,
          user: slack_id
        }
      })
      .then( res => {
        console.log("returned from slack:", res.data.user.name);
        res.data.error ? reject(res.data) : resolve(res.data)
      });
    }),

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
