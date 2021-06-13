const getTrendAndSave = require('./get-trend-and-save');
const { pick } = require('underscore');
const NUM = 10;

module.exports = async () => {
  const trend = await getTrendAndSave();
  const cheapest = trend
    .sort((a, b) => a.last_trade_price - b.last_trade_price)
    .slice(0, NUM)
    .map(stock => pick(
      stock, 
      ['ticker', 'last_trade_price', 'trend_since_prev_close']
    ));
  strlog({ cheapest, length: cheapest.length });
  return cheapest;
};