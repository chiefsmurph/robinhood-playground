const Pick = require('../models/Pick');
module.exports = cacheThis(async (...params) => {
    const response = await Pick.getRecentPicksForTicker(...params);
    return response;
}, 5);