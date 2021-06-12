const { alpaca } = require('../alpaca');
const getPositions = require('../alpaca/get-positions');
const limitBuyMultiple = require('./limit-buy-multiple');
const lookup = require('../utils/lookup');
const alpacaCancelAllOrders = require('../alpaca/cancel-all-orders');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');

export default async (_, dontAct) => {

  const { onlyUseCash } = await getPreferences();

  // step 1 get positions
  let positions = await getPositions();
  const daytrades = positions.filter(({ wouldBeDayTrade }) => wouldBeDayTrade);


  // step two get account
  // and calc amtToSpend perStock
  await alpacaCancelAllOrders(undefined, 'buy');



  const account = await alpaca.getAccount();
  console.log('Current Account:', account);
  const { equity, buying_power, cash, daytrade_count, maintenance_margin } = account;

  const amtToSpend = (() => {
    if (onlyUseCash) return cash;
    if (equity > maintenance_margin) return Math.min(buying_power, (equity * 0.9) - maintenance_margin);
    return buying_power;
  })();
  const maxPerStock = equity / 53;
  const perStock = Math.min(amtToSpend / daytrades.length, maxPerStock);
  await log(`after hours buys $${perStock} / stock`, {
    amtToSpend,
    daytrades: daytrades.map(t => t.ticker),
    maxPerStock,
    onlyUseCash,
    equity,
    maintenance_margin,
    buying_power
  });


  if (perStock < 6) return log('sorry after hours buys not happening because perStock < 6', {
    equity,
    maintenance_margin,
    buying_power,
    maxPerStock,
    perStock
  })

  const min = getMinutesFromOpen();
  const mult = (() => {
    if (min > 360) return 1.01;
    if (min < 400) return .99;
    return 1;
  })();
  await Promise.all(
    daytrades.map(async (position, index) => {
      const { ticker, currentPrice } = position;
      await new Promise(resolve => setTimeout(resolve, 1500 * index));
      await log(`afterhours buy ${ticker}`);
      const l = await lookup(ticker) || {};
      const price = (l.currentPrice || currentPrice) * mult;
      return limitBuyMultiple({
        totalAmtToSpend: perStock,
        strategy: 'ahbuys',
        withPrices: [{
          ticker,
          price,
        }]
      });
    })
  );
};