const getPositions = require('./get-positions');
const { alpaca } = require('.');
const { partition } = require('underscore');
const { sumArray } = require('../utils/array-math');
const { actOnStPercent, onlyUseCash } = require('../settings');
const sellPosition = require('./sell-position');
const cancelAllOrders = require('./cancel-all-orders');
const attemptBuy = require('./attempt-buy');

module.exports = async () => {
  const account = await alpaca.getAccount();
  const maxDollarsToSpendAllowed = Number(account.cash) / 2;

  let amtToSpend = Number(account.equity * actOnStPercent / 100);

  if (onlyUseCash) {
    amtToSpend = Math.min(maxDollarsToSpendAllowed, amtToSpend);
  }
  
  if (amtToSpend <= 10) {
    return log('not enough money to act on st');
  }

  strlog({ account})


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
    await cancelAllOrders(position.ticker, 'buy');
    sellPosition({
      ...position,
      percToSell: actOnStPercent * 2
    });
  }

  // buy bullish dayTrades
  const BULLBEARSUPERBLASTLIMIT = 270;
  const bullishDayTrades = daytrades
    .filter(p => (p.stSent || {}).stBracket === 'bullish')
    .sort((a, b) => (b.stSent || {}).bullBearScore - (a.stSent || {}).bullBearScore)
    .slice(0, 7);
  const specialExceptions = notDaytrades.filter(p =>
    (p.stSent || {}).bullBearScore > BULLBEARSUPERBLASTLIMIT * 1.5  // 405
    && p.recommendation !== 'take profit'
  );
  if (specialExceptions.length) {
    await log(`actonst special exceptions (super bullish not daytrades) - ${label(specialExceptions)}`);
  }
  const toBuy = [
    ...bullishDayTrades,
    ...specialExceptions,
  ];
  const totalValue = sumArray(
    toBuy.map(p => Number(p.market_value)).filter(Boolean)
  );

  const dollarsToBuyPerStock = Math.ceil(amtToSpend / toBuy.length);
  await log(`ACTONST-BULLISH: $${amtToSpend} total - ${label(toBuy)}`, {
    toBuy,
    totalValue,
    amtToSpend,
    dollarsToBuyPerStock
  });
  for (let position of toBuy) {
    const { ticker, stSent, currentPrice } = position;
    await cancelAllOrders(ticker, 'sell');
    await log(`buying ${ticker}`);
    const { bullBearScore } = stSent;
    const multiplier = Math.min(3, Math.max(1, Math.floor((bullBearScore - 100) / 100)));
    const quantity = Math.ceil((dollarsToBuyPerStock * multiplier) / currentPrice);
    attemptBuy({
      ticker,
      quantity,
      bullBearScore,
      multiplier,
      pickPrice: currentPrice,
      fallbackToMarket: true
    });
  }



};