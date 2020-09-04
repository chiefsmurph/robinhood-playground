const { alpaca } = require('../alpaca');
const limitBuyMultiple = require('./limit-buy-multiple');
const lookup = require('../utils/lookup');
const Pick = require('../models/Pick');

module.exports = async () => {

  const { equity } = await alpaca.getAccount();
  const mostDownPick = require('../socket-server/strat-manager').getMostDownPick();
  if (!mostDownPick) return log('no most down pick currently');
  const { tickers, strategyName } = mostDownPick;
  const [ticker] = tickers;
  let totalAmtToSpend = equity * 0.007;
  if (!strategyName.includes('hotSt')) {
    totalAmtToSpend *= 1.5;
  }
  if (strategyName.includes('sudden')) {
    totalAmtToSpend *= 2;
  }
  totalAmtToSpend = Math.ceil(totalAmtToSpend);
  await log(`purchasing most down pick - ${ticker} ${totalAmtToSpend} @ ${await lookup(ticker)}`);
  await Pick.updateOne({ _id: mostDownPick._id }, { isRecommended: true });
  await limitBuyMultiple({
    totalAmtToSpend,
    strategy: 'most-down-pick',
    ticker
  });

};