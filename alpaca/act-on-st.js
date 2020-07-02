const getPositions = require('./get-positions');
const { alpaca } = require('.');
const { partition } = require('underscore');
const { sumArray } = require('../utils/array-math');
const { actOnStPercent, onlyUseCash } = require('../settings');
const sellPosition = require('./sell-position');
const cancelAllOrders = require('./cancel-all-orders');
const attemptBuy = require('./attempt-buy');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const limitBuyMultiple = require('../app-actions/limit-buy-multiple');

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
    .filter(p => (p.stSent || {}).stBracket === 'bullish' && p.returnPerc < -2)
    .filter(p => (p.stSent || {}).bullBearScore > 170)
    .sort((a, b) => (b.stSent || {}).bullBearScore - (a.stSent || {}).bullBearScore)
    .slice(0, 7);
  const specialExceptions = notDaytrades.filter(p =>
    (p.stSent || {}).bullBearScore > BULLBEARSUPERBLASTLIMIT * 1.3  // 351
    && p.returnPerc < -6
    && getMinutesFromOpen() > 30
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
    const { ticker, stSent, currentPrice, numMultipliers, returnPerc } = position;
    await cancelAllOrders(ticker, 'sell');
    const { bullBearScore } = stSent;
    const bullBearMultiplier = Math.min(4, Math.max(1, Math.floor((bullBearScore - 100) / 100)));
    const multiplierMultiplier = Math.floor(numMultipliers / 300);
    const returnPercMultiplier = Math.abs(Math.ceil(returnPerc / 5));
    let multiplier = bullBearMultiplier;
    multiplier += Math.min(4, multiplierMultiplier + returnPercMultiplier);
    const totalAmtToSpend = Math.round(dollarsToBuyPerStock * multiplier);
    const quantity = Math.ceil(totalAmtToSpend / currentPrice);
    await log(`ST buying ${ticker} about $${totalAmtToSpend} around ${currentPrice}`, {
      ticker,
      quantity,
      multiplier,
      bullBearMultiplier,
      multiplierMultiplier,
      returnPercMultiplier,
      bullBearScore,
      numMultipliers
    });
    limitBuyMultiple({
      totalAmtToSpend,
      strategy: 'ACTONST',
      withPrices: [{
        ticker,
        price: currentPrice
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