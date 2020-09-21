const getPositions = require('./get-positions');
const { alpaca } = require('.');
const { partition, pick } = require('underscore');
const { sumArray } = require('../utils/array-math');
const { disableActOnSt } = require('../settings');
const sellPosition = require('./sell-position');
const cancelAllOrders = require('./cancel-all-orders');
const attemptBuy = require('./attempt-buy');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const limitBuyMultiple = require('../app-actions/limit-buy-multiple');
const lookup = require('../utils/lookup');
const Hold = require('../models/Holds');

module.exports = async () => {

  if (disableActOnSt) return log('act on st disabled');

  const { onlyUseCash, actOnStPercent } = await getPreferences();

  const account = await alpaca.getAccount();
  let amtToSpend = Number(account.equity * actOnStPercent / 100);

  if (onlyUseCash) {
    amtToSpend *= 0.6;
    const maxDollarsToSpendAllowed = Number(account.cash) / 2;
    amtToSpend = Math.min(maxDollarsToSpendAllowed, amtToSpend);
  }
  
  if (amtToSpend <= 3) {
    return log('not enough money to act on st');
  }

  strlog({ account})


  const positions = await getPositions();


  await log('ACTONST POSITIONS', {
    positions: positions
      .sort((a, b) => Number(b.market_value) - Number(a.market_value))
      .map(p => ({
        ...p,
        bullBearScore: (p.stSent || {}).bullBearScore
      }))
      .map(p => pick(p, ['ticker', 'wouldBeDayTrade', 'returnPerc', 'bullBearScore']))
  })


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
    .filter(p => (p.stSent || {}).stBracket === 'bullish' && p.returnPerc < 0.5)
    .filter(p => (p.stSent || {}).bullBearScore > 170)
    .sort((a, b) => (b.stSent || {}).bullBearScore - (a.stSent || {}).bullBearScore)
    .slice(0, 7);

    strlog({ notDaytrades })
  const exceptionAmts = {
    400: 10,
    350: 8,
    300: 6,
    250: 4,
  };
  const specialExceptions = notDaytrades
    .filter(p => Number(p.market_value) < Number(account.equity) * 0.8)
    .filter(p => {
      const foundExc = Object.entries(exceptionAmts).find(([bbScore]) => (p.stSent || {}).bullBearScore >= Number(bbScore));
      const passesExc = foundExc && p.returnPerc < foundExc[1];
      return passesExc && getMinutesFromOpen() > 20;
    });
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
    const { ticker, stSent, numMultipliers, returnPerc } = position;
    await cancelAllOrders(ticker, 'sell');
    const { currentPrice: pickPrice } = await lookup(ticker);
    const { bullBearScore } = stSent;
    const bullBearMultiplier = Math.min(4, Math.max(1, Math.floor((bullBearScore - 100) / 100)));
    const multiplierMultiplier = Math.floor(numMultipliers / 300);
    const returnPercMultiplier = Math.abs(Math.ceil(returnPerc / 5));
    let multiplier = bullBearMultiplier;
    multiplier += Math.min(4, multiplierMultiplier + returnPercMultiplier);
    const totalAmtToSpend = Math.round(dollarsToBuyPerStock * multiplier);
    const quantity = Math.ceil(totalAmtToSpend / pickPrice);
    await log(`ST buying ${ticker} about $${totalAmtToSpend} around ${pickPrice}`, {
      ticker,
      quantity,
      multiplier,
      bullBearMultiplier,
      multiplierMultiplier,
      returnPercMultiplier,
      bullBearScore,
      numMultipliers
    });
    await Hold.updateOne(
      { ticker},
      { $inc: { stPoints: Math.round(totalAmtToSpend) } }
    );
    limitBuyMultiple({
      totalAmtToSpend,
      strategy: 'ACTONST',
      withPrices: [{
        ticker,
        price: pickPrice
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