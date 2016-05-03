
var mongoose       = require('mongoose');
var Team           = require("../app/models/team");
var User           = require("../app/models/user");


/**
 * botkit-storage-mongo - MongoDB driver for Botkit
 *
 * @param  {Object} config
 * @return {Object}
 */
module.exports = function(config) {

    if (!config || !config.mongoUri)
        throw new Error('Need to provide mongo address.');
        
    mongoose.connect(config.mongoUri);
    console.log('Connected to Mongo:', config.mongoUri);
    
    

    var unwrapFromList = function(cb) {
        return function(err, data) {
            if (err) return cb(err);
            cb(null, data);
        };
    };

    //
    var channels;
    
    var storage = {
        teams: {
            get: function(id, cb) {
                Team.findOne({id: id}, unwrapFromList(cb));
            },
            save: function(data, cb) {
                let query = Team.where({ id: data.id });
                Team.findOneAndUpdate(query, data, {
                    upsert: true,
                    new: true
                }, cb);
            },
            all: function(cb) {
                Team.find({}, cb);
            }
        },
        users: {
            get: function(id, cb) {
                User.findOne({id: id}, unwrapFromList(cb));
            },
            save: function(data, cb) {
              console.log('Storage.users: data', data);
              let query = User.where({ id: data.id });
                User.findOneAndUpdate(query, data, {
                    upsert: true,
                    new: true
                }, cb);
            },
            all: function(cb) {
                User.find({}, cb);
            }
        },
        // Channels is not currently be used
        // if needed this should be ported over to mongoose from monk
        channels: {
            get: function(id, cb) {
                Channels.findOne({id: id}, unwrapFromList(cb));
            },
            save: function(data, cb) {
                Channels.findAndModify({
                    id: data.id
                }, data, {
                    upsert: true,
                    new: true
                }, cb);
            },
            all: function(cb) {
                Channels.find({}, cb);
            }
        }
    };

    return storage;
};
