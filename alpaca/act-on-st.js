const getPositions = require('./get-positions');
const { alpaca } = require('.');
const { partition } = require('underscore');
const { sumArray } = require('../utils/array-math');
const { actOnStPercent } = require('../settings');
const sellPosition = require('./sell-position');
const attemptBuy = require('./attempt-buy');

module.exports = async () => {
  const positions = await getPositions();
  const [daytrades, notDaytrades] = partition(positions, p => p.wouldBeDayTrade);

  const label = ps => ps.map(p => p.ticker).join(', ');

  // sell bearish notDaytrades
  const toSell = notDaytrades.filter(p => (p.stSent || {}).stBracket === 'bearish');
  await log(`ACTONST-BEARISH: ${label(toSell)}`, {
    toSell,
    actOnStPercent
  });
  for (let position of toSell) {
    sellPosition({
      ...position,
      percToSell: actOnStPercent
    });
  }

  // buy bullish dayTrades
  const toBuy = daytrades.filter(p => (p.stSent || {}).stBracket === 'bullish');
  const totalValue = sumArray(
    toBuy.map(p => Number(p.market_value)).filter(Boolean)
  );
  const dollarsToBuyTotal = Math.round(totalValue * (actOnStPercent / 100));
  const dollarsToBuyPerStock = Math.ceil(dollarsToBuyTotal / toBuy.length);
  await log(`ACTONST-BULLISH: $${dollarsToBuyTotal} total - ${label(toBuy)}`, {
    toBuy,
    totalValue,
    dollarsToBuyTotal,
    dollarsToBuyPerStock
  });
  for (let position of toBuy) {
    const { ticker, stSent, currentPrice } = position;
    const { bullBearScore } = stSent;
    const multiplier = bullBearScore > 270 ? 2 : 1;
    const quantity = Math.ceil((dollarsToBuyPerStock * multiplier) / currentPrice);
    attemptBuy({
      ticker,
      quantity,
      pickPrice: currentPrice,
      fallbackToMarket: true
    });
  }



};