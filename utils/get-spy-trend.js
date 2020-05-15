const lookup = require('./lookup');
const cacheThis = require('./cache-this');
const getTrend = require('./get-trend');
const {
  getDailyHistoricals,
} = require('../realtime/historicals/add-daily-historicals');

module.exports = cacheThis(async () => {
  const { SPY: daily } = await getDailyHistoricals(['SPY']);
  const prevClose = daily[daily.length - 1].close_price;
  const { currentPrice } = await lookup('SPY');
  console.log({ prevClose, currentPrice })
  const trend = getTrend(currentPrice, prevClose);
  await log(`SPY trend set to ${trend}`)
  return trend;
}, 20);