const getPositions = require('./get-positions');
const { alpaca } = require('.');
const { partition } = require('underscore');
const { sumArray } = require('../utils/array-math');
const { actOnStPercent, onlyUseCash } = require('../settings');
const sellPosition = require('./sell-position');
const cancelAllOrders = require('./cancel-all-orders');
const attemptBuy = require('./attempt-buy');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');

module.exports = async () => {

  const account = await alpaca.getAccount();
  let amtToSpend = Number(account.equity * actOnStPercent / 100);

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
    .filter(p => p.wouldBeDayTrade)
    .filter(p => (p.stSent || {}).stBracket !== 'bearish' && p.returnPerc < -6)
    .filter(p => p.numMultipliers > 40)
    .sort((a, b) => b.numMultipliers - a.numMultipliers)
    .slice(0, 3);

  const dollarsToBuyPerStock = Math.ceil(amtToSpend / toBuy.length);
  await log(`ACTONMULTIPLIERS: $${amtToSpend} total - ${label(toBuy)}`, {
    toBuy,
    amtToSpend,
    dollarsToBuyPerStock
  });
  for (let position of toBuy) {
    const { ticker, stSent, currentPrice, numMultipliers, returnPerc } = position;
    await cancelAllOrders(ticker, 'sell');
    const quantity = Math.ceil(3 * dollarsToBuyPerStock / currentPrice);
    await log(`ACTONMULT buying ${ticker} about $${Math.round(currentPrice * quantity)} around ${currentPrice} bc numMultipliers ${numMultipliers} & returnPerc ${returnPerc}`, {
      ticker,
      quantity,
      numMultipliers,
      returnPerc
    });
    attemptBuy({
      ticker,
      quantity,
      pickPrice: currentPrice,
      fallbackToMarket: true
    });
  }



};