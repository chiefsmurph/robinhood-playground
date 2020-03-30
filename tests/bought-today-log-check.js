const Log = require('../models/Log');
module.exports = async ticker => {
  return Log.boughtToday(ticker);
};