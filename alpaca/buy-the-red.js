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

export default async () => {

  const { actOnPercent, onlyUseCash } = await getPreferences();

  const account = await alpaca.getAccount();
  let amtToSpend = Number(account.equity * actOnPercent / 100);

  if (onlyUseCash) {
    amtToSpend *= 0.6;
    const account = await alpaca.getAccount();
    const maxDollarsToSpendAllowed = Number(account.cash) / 2;
    amtToSpend = Math.min(maxDollarsToSpendAllowed, amtToSpend);
  } else {
    amtToSpend = Math.min(amtToSpend, Number(account.buying_power));
  }
  
  if (amtToSpend <= 2) {
    return log('not enough money to buy the red');
  }

  strlog({ account})


  const positions = await require('../socket-server/strat-manager').refreshPositions();


  const label = ps => ps.map(p => p.ticker).join(', ');

  // buy the positions in the red with the most multipliers
  const toBuy = positions
    .filter(p => p.wouldBeDayTrade)
    // .filter(p => (p.stSent || {}).stBracket !== 'bearish')
    .filter(p => p.returnPerc < -8);
  await log(`BUYTHERED: $${amtToSpend} total - ${label(toBuy)}`, {
    toBuy,
    amtToSpend,
  });
  for (let position of toBuy) {
    const { ticker, numMultipliers, returnPerc, market_value, mostDownPoints, pickPoints, zScorePoints, stPoints } = position;
    const dollarsToBuy = Math.abs(Math.floor(returnPerc)) * amtToSpend;
    await cancelAllOrders(ticker, 'sell');
    const { currentPrice: pickPrice } = await lookup(ticker);
    const quantity = Math.ceil(dollarsToBuy / pickPrice);
    await log(`BUYTHERED buying ${ticker} about $${Math.round(dollarsToBuy)} around ${pickPrice} bc amtToSpend ${amtToSpend} & returnPerc ${returnPerc}`, {
      ticker,
      quantity,
      numMultipliers,
      returnPerc
    });
    limitBuyMultiple({
      ticker,
      totalAmtToSpend: dollarsToBuy,
      strategy: 'buy-the-red'
    });
    await Hold.updateOne(
      { ticker },
      { $inc: { buyTheRedPoints: Math.round(dollarsToBuy) } }
    );
  }



};