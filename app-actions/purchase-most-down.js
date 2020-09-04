const { alpaca } = require('../alpaca');
const limitBuyMultiple = require('./limit-buy-multiple');
const lookup = require('../utils/lookup');
const Pick = require('../models/Pick');

module.exports = async () => {

  const { equity } = await alpaca.getBalance();
  const mostDownPick = require('../socket-server/strat-manager').getMostDownPick();
  const [ticker] = mostDownPick.tickers;
  await log(`purchasing most down pick - ${ticker} @ ${await lookup(ticker)}`);
  await Pick.updateOne({ _id: mostDownPick._id }, { isRecommended: true });
  await limitBuyMultiple({
    totalAmtToSpend: Math.ceil(equity * 0.008),
    strategy: 'most-down-pick',
    ticker
  });

};