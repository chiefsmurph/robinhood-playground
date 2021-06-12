const Pick = require('../models/Pick');
const cacheThis = require('./cache-this');
export default cacheThis(async (...params) => {
    const response = await Pick.getRecentPicksForTicker(...params);
    return response;
}, 5);