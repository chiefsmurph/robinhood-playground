const Pick = require('../models/Pick');
module.exports = async (numDays = 3, search = '') => {
    return Pick.getRecentRecommendations(numDays);
};