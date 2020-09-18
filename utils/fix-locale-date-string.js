// fix because new server formats like - year-month-day
// we want month-day-year
const Log = require('../models/Log');
const jsonMgr = require('./json-mgr');

require('../app-actions/get-related-position');

const oldLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function() {
    // console.log('ouch baby.', this.getTime());
    const prevOutput = oldLocaleDateString.apply(this);
    const year = this.getFullYear();
    const month = this.getMonth() + 1;
    const day = this.getDate();
    // if (year.toString().length !== 4) return prevOutput;
    return [month, day, year].join('-');
};

console.log('ATTENTION');
console.log(`CURRENT DATE: ${(new Date()).toLocaleDateString()}`);


// RUTHLESS GLOBALS!!!

global.log = async (title, data) => {
    const logObj = {
        title,
        data
    };
    const logDoc = await Log.create(logObj);
    console.log(`LOG --- ${title}`, data);
    require('../socket-server/strat-manager').sendToAll(
        'server:log',
        logDoc
    );
};

global.getPreferences = () => jsonMgr.get('./json/preferences.json');
global.savePreferences = async (preferences, user) => 
    jsonMgr.save('./json/preferences.json', preferences);

global.str = global.strlog = obj => console.log(JSON.stringify(obj, null, 2));
global.mapLimit = require('promise-map-limit');

Array.prototype.flatten = function() {
    return [].concat(...this);
};

Array.prototype.uniq = function() {
    return [...new Set(this)];
};

Array.prototype.cutBottom = function(percCut = 30, actuallyTop) {
    const length = this.length;
    const bottomAmt = length * percCut / 100;
    const endIndex = actuallyTop ? bottomAmt : length - bottomAmt;
    console.log('end', bottomAmt);
    return this.slice(0, endIndex);
};

Number.prototype.twoDec = function() {
    const roundTo = numDec => num => Math.round(num * Math.pow(10, numDec)) / Math.pow(10, numDec);
    return roundTo(2)(this);
};

const cTable = require('console.table');

const _ = require('underscore');

_.mixin({
    get: function(obj, path) {
        if (!obj && !path) {
            return undefined;
        } else {
            var paths;
  
            if (!_.isEmpty(path.match(/^\[\d\]/))) {
                paths = path.replace(/^[\[\]]/g, '').split(/\./);
                nPath = _.first(paths[0].replace(/\]/, ''));
            } else {
                paths = path.split(/[\.\[]/);
                nPath = _.first(paths);
            }
  
            remainingPath = _.reduce(_.rest(paths), function(result, item) {
                if (!_.isEmpty(item)) {
                    if (item.match(/^\d\]/)) {
                        item = "[" + item;
                }
                    result.push(item);
                }
  
                return result;
            }, []).join('.');
  
            if (_.isEmpty(remainingPath)) {
                return obj[nPath];
            } else {
                return _.has(obj, nPath) && _.get(obj[nPath], remainingPath);
            }
        }
    },


    prefixKeys: function (obj, prefix){
        var b = {};
        _.each(obj, function(value, key) {
            const withPrefix = [prefix, key].join('');
            b[withPrefix] = value;
        });
        return b;
    }
});