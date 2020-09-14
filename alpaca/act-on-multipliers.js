const getPositions = require('./get-positions');
const { alpaca } = require('.');
const { partition } = require('underscore');
const { sumArray } = require('../utils/array-math');

const sellPosition = require('./sell-position');
const cancelAllOrders = require('./cancel-all-orders');
const limitBuyMultiple = require('../app-actions/limit-buy-multiple');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const lookup = require('../utils/lookup');
const Hold = require('../models/Holds');

module.exports = async () => {

  const { actOnStPercent, onlyUseCash } = await getPreferences();

  const account = await alpaca.getAccount();
  let amtToSpend = Number(account.equity * actOnStPercent / 100 * 3);

  if (onlyUseCash) {
    amtToSpend *= 0.6;
    const account = await alpaca.getAccount();
    const maxDollarsToSpendAllowed = Number(account.cash) / 2;
    amtToSpend = Math.min(maxDollarsToSpendAllowed, amtToSpend);
  }
  
  if (amtToSpend <= 20) {
    return log('not enough money to act on st');
  }

  strlog({ account})


  const positions = await getPositions();

  const label = ps => ps.map(p => p.ticker).join(', ');

  // buy the positions in the red with the most multipliers
  const toBuy = positions
    // .filter(p => p.wouldBeDayTrade)
    // .filter(p => (p.stSent || {}).stBracket !== 'bearish')
    .filter(p => p.returnPerc < -7)
    .sort((a, b) => b.numMultipliers - a.numMultipliers)
    .slice(0, 3);

  const dollarsToBuyPerStock = Math.ceil(amtToSpend / toBuy.length) * 5;
  await log(`ACTONMULTIPLIERS: $${amtToSpend} total - ${label(toBuy)}`, {
    toBuy,
    amtToSpend,
    dollarsToBuyPerStock
  });
  for (let position of toBuy) {
    const { ticker, numMultipliers, returnPerc, market_value, mostDownPoints, pickPoints, zScorePoints, stPoints } = position;
    const totalPoints = sumArray([mostDownPoints, pickPoints, zScorePoints, stPoints]);
    await cancelAllOrders(ticker, 'sell');
    const { currentPrice: pickPrice } = await lookup(ticker);
    const dollarsToBuy = market_value;
    const quantity = Math.ceil(dollarsToBuy / pickPrice);
    await log(`ACTONMULT buying ${ticker} about $${Math.round(dollarsToBuy)} around ${pickPrice} bc numMultipliers ${numMultipliers} & returnPerc ${returnPerc}`, {
      ticker,
      quantity,
      numMultipliers,
      returnPerc
    });
    limitBuyMultiple({
      ticker,
      quantity,
      strategy: 'act-on-mult'
    });
    await Hold.updateOne(
      { ticker },
      { $inc: { actOnMultPoints: Math.round(dollarsToBuy) } }
    );
  }



};