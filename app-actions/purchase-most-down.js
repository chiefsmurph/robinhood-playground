const { alpaca } = require('../alpaca');
const limitBuyMultiple = require('./limit-buy-multiple');
const lookup = require('../utils/lookup');
const Pick = require('../models/Pick');
const Hold = require('../models/Holds');

module.exports = async () => {

  const { equity } = await alpaca.getAccount();
  const superDownPicks = require('../socket-server/strat-manager').getSuperDownPicks();
  if (!superDownPicks.length) return log('no super down picks currently');


  for (const superDownPick of superDownPicks) {
    const { ticker, picks } = superDownPick;
    const mostDownPick = picks[0];
    let totalAmtToSpend = equity * 0.007;
    if (!strategyName.includes('hotSt')) {
      totalAmtToSpend *= 1.5;
    }
    if (strategyName.includes('sudden')) {
      totalAmtToSpend *= 2;
    }
    totalAmtToSpend = Math.ceil(totalAmtToSpend);
    await log(`purchasing super down pick - ${ticker} ${totalAmtToSpend} @ ${await lookup(ticker)}`);
    await Pick.updateOne({ _id: mostDownPick._id }, { isRecommended: true });
    await Hold.updateOne(
      { ticker},
      { $inc: { mostDownPoints: Math.round(totalAmtToSpend) } }
    );
    await limitBuyMultiple({
      totalAmtToSpend,
      strategy: 'most-down-pick',
      ticker
    });

  }


};