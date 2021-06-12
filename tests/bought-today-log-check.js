const Log = require('../models/Log');
export default async ticker => {
  return Log.boughtToday(ticker);
};