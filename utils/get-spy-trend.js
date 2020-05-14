const lookup = require('./lookup');
const cacheThis = require('./cache-this');
const getTrend = require('./get-trend');

module.exports = cacheThis(async () => {
  const { prevClose, currentPrice } = await lookup('SPY');
  const trend = getTrend(currentPrice, prevClose);
  await log(`SPY trend set to ${trend}`)
  return trend;
}, 20);