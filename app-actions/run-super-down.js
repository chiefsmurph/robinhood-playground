const { alpaca } = require('../alpaca');
const limitBuyMultiple = require('./limit-buy-multiple');
const lookup = require('../utils/lookup');
const Pick = require('../models/Pick');
const Hold = require('../models/Holds');

module.exports = async () => {

  const { equity } = await alpaca.getAccount();
  const superDownPicks = await require('../socket-server/strat-manager').getSuperDownPicks();
  if (!superDownPicks.length) return log('no super down picks currently');

  for (const superDownPick of superDownPicks) {
    const { ticker, avgTrend, picks } = superDownPick;
    const mostDownPick = picks[0];
    let forceMultiplier = equity * 0.007;
    const multiplier = Math.max(1, Math.round(avgTrend / -10));
    forceMultiplier = forceMultiplier * multiplier;
    const maxPickMultiplier = Math.max(picks.map(pick => pick.multiplier).filter(Boolean)) || 0;
    forceMultiplier = forceMultiplier + maxPickMultiplier + (mostDownPick.avgTrend * -2);
    forceMultiplier = Math.round(forceMultiplier);
    await log(`purchasing super down pick - ${ticker} ${forceMultiplier} @ ${(await lookup(ticker)).currentPrice}`);
    // await Pick.updateOne({ _id: mostDownPick._id }, { isRecommended: true });
    await Hold.updateOne(
      { ticker},
      { $inc: { mostDownPoints: Math.round(forceMultiplier) * (getPreferences()).purchaseAmt } }
    );
    // require('../realtime/RealtimeRunner').handlePick({
    //   strategyName: 'continue-down',
    //   ticker,
    //   keys: {
    //     [`${daysOld}daysOld`]: true,
    //     outsideBracket,
    //     downAlot: returnPerc < -10
    //   },
    //   data: { 
    //     position
    //   }
    // }, true);
    await require('../realtime/RealtimeRunner').handlePick({
      strategyName: 'supr-dwn',
      ticker,
      keys: {},
      data: {
        forceMultiplier,
        avgTrendDown: avgTrend,
        numPicks: picks.length,
        superInterestingWords: [
          ...picks.map(pick => pick.strategyName.split('-')),
          ...picks.map(pick => pick.interestingWords),
        ].filter(Boolean).flatten().filter(Boolean).uniq()
      }
    });
  }


};