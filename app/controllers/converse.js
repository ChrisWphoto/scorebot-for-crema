/*
  Analyzes text associated with direct mention (@scorebot)
  and responds accordingly
*/
"use strict";

var Medal         = require('../models/medal');

function getReactions(msg) {
  return msg.text.match(/:\w+:/g); //e.g. [':simple_smile:']
};

function getReactionValues(msg) {
  return msg.text.match(/([0-9]\d+)|[0-9]/g); // single and multiple digits e.g. ['35'] || ['1']
};

//e.g. [:smile:] --> [smile]
function stripColons(array){
  return array.map( react => react.substring(1, react.length -1) );
};

function saveMedalValue(medalArray, medalValArray, bot, msg){
  console.log(medalValArray);
  let medalName   = stripColons(medalArray)[0]; //grab only first reaction name
  let medalValue  = medalValArray[0]; //grab only first medal value
  let query       = Medal.where({reaction: medalName});
  let medalData   = {reaction: medalName, value: medalValue};
  console.log(medalData);
  Medal.findOneAndUpdate(query, medalData, {
    upsert: true,
    new: true
  }, (err, newMedal) => {
    if (err) {console.log("medal failed to update:", err); return;}
    console.log('Medal Updated via conversation:\n', newMedal);
    bot.reply(msg,"The game has changed! :" + newMedal.reaction + ": is now worth " + newMedal.value + "pts.");
  }); 
}



var Converse = {
  
  updateMedal: function(bot, msg) {
    let arrayOfNumbers = getReactionValues(msg);
    let arrayOfReactions = getReactions(msg);
    //received reaction(s) and value(s) persisting in database   
    if (arrayOfNumbers && arrayOfReactions){
      saveMedalValue(arrayOfReactions, arrayOfNumbers, bot, msg);
    }else { //Ask user to fill in missing info to set value of medal
      console.log('Missing info trying to update medal',arrayOfNumbers, arrayOfReactions)
      
      //we are missing the reaction
      if (!arrayOfReactions && arrayOfNumbers){
        bot.startConversation(msg, ( res, convo ) => {
          let question = "Hi :simple_smile: To update reactions I first need a reaction, send me :a_reaction: or click the face on the right." 
          convo.ask(question, ( res, convo ) => {
            let arrayOfReactions = getReactions(res);
            if(arrayOfReactions) saveMedalValue(arrayOfReactions, arrayOfNumbers, bot, msg);
            convo.next();
          });
        }); 
      }
      
      //we are missing the value of the reaction
      else if (arrayOfReactions && !arrayOfNumbers){
        bot.startConversation(msg, ( res, convo ) => {
          let question = "Hi :simple_smile: To update reactions I first need a number, send me a 5 a 10 or whatever number you want." 
          convo.ask(question, ( res, convo ) => {
            let arrayOfNumbers = getReactionValues(res);
            if(arrayOfReactions) saveMedalValue(arrayOfReactions, arrayOfNumbers, bot, msg);
            convo.next();
          });
        }); 
      }
      //we are missing both reaction and value
      else {
        bot.reply(msg,"I think you're trying to set the value of a reaction. Try sending this: :smirk: = 5");
      }
      
      
    } 
  }
  
}

module.exports = Converse;
