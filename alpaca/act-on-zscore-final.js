const getPositions = require('./get-positions');
const { alpaca } = require('.');
const { partition, pick } = require('underscore');
const { sumArray, zScore } = require('../utils/array-math');
const { actOnStPercent, onlyUseCash } = require('../settings');
const sellPosition = require('./sell-position');
const cancelAllOrders = require('./cancel-all-orders');
const attemptBuy = require('./attempt-buy');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const limitBuyMultiple = require('../app-actions/limit-buy-multiple');
const lookup = require('../utils/lookup');

module.exports = async () => {

  const account = await alpaca.getAccount();
  let amtToSpend = Number(account.equity * actOnStPercent / 100);

  if (onlyUseCash) {
    amtToSpend *= 0.6;
    const maxDollarsToSpendAllowed = Number(account.cash) / 2;
    amtToSpend = Math.min(maxDollarsToSpendAllowed, amtToSpend);
  }
  
  if (amtToSpend <= 20) {
    return log('not enough money to act on st');
  }

  strlog({ account})


  const positions = await getPositions();


  await log('ACTONZSCOREFINAL', {
    positions: positions
      .sort((a, b) => Number(b.zScoreFinal) - Number(a.zScoreFinal))
      .map(p => ({
        ...p,
        bullBearScore: (p.stSent || {}).bullBearScore
      }))
      .map(p => pick(p, ['ticker', 'market_value', 'returnPerc', 'bullBearScore', 'zScoreFinal']))
  })


  const toBuy = positions
    .filter(p => p.wouldBeDayTrade && p.zScoreFinal > 0.7 && p.scan && p.zScoreSum > 0);
  const label = ps => ps.map(p => p.ticker).join(', ');

  const totalValue = sumArray(
    toBuy.map(p => Number(p.market_value)).filter(Boolean)
  );

  const dollarsToBuyPerStock = Math.ceil(amtToSpend / 2);
  await log(`ACTONZSCOREFINAL: $${amtToSpend} total - ${label(toBuy)}`, {
    toBuy,
    totalValue,
    amtToSpend,
    dollarsToBuyPerStock
  });
  for (let position of toBuy) {
    const { ticker, currentPrice, zScoreFinal, zScoreSum } = position;
    await cancelAllOrders(ticker, 'sell');
    const MAX_MULT = 4;
    const multiplier = Math.min(MAX_MULT, Math.ceil(zScoreFinal));
    let totalAmtToSpend = Math.round(dollarsToBuyPerStock * multiplier);
    // interesting....
    totalAmtToSpend += Math.ceil(zScoreSum);
    const quantity = Math.ceil(totalAmtToSpend / currentPrice);
    await log(`ACTONZSCOREFINAL buying ${ticker} about $${totalAmtToSpend} around ${currentPrice}`, {
      ticker,
      quantity,
      multiplier,
    });
    limitBuyMultiple({
      totalAmtToSpend,
      strategy: 'ACTONZSCOREFINAL',
      withPrices: [{
        ticker,
        price: (await lookup(ticker)).currentPrice || currentPrice
      }]
    });
    // attemptBuy({
    //   ticker,
    //   quantity,
    //   pickPrice: currentPrice,
    //   fallbackToMarket: true
    // });
  }



};