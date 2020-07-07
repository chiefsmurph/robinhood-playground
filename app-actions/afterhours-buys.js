const { alpaca } = require('../alpaca');
const getPositions = require('../alpaca/get-positions');
const limitBuyMultiple = require('./limit-buy-multiple');
const { onlyUseCash } = require('../settings');

module.exports = async (_, dontAct) => {

  let positions = await getPositions();
  const daytrades = positions.filter(({ wouldBeDayTrade }) => wouldBeDayTrade);


  const account = await alpaca.getAccount();
  console.log('Current Account:', account);
  const { equity, buying_power, cash, daytrade_count, maintenance_margin } = account;

  const amtToSpend = (() => {
    if (onlyUseCash) return cash;
    // if (equity < maintenance_margin) return maintenance_margin - equity;
    return buying_power;
  });
  const maxPerStock = equity / 53;
  const perStock = Math.min(amtToSpend / daytrades.length, maxPerStock);
  await log(`after hours buys $${perStock} / stock`, {
    amtToSpend,
    daytrades: daytrades.map(t => t.ticker),
    maxPerStock
  });

  await Promise.all(
    daytrades.map(async (position, index) => {
      const { ticker, currentPrice } = position;
      await new Promise(resolve => setTimeout(resolve, 1500 * index));
      await log(`afterhours buy ${ticker}`);
      return limitBuyMultiple({
        totalAmtToSpend: perStock,
        strategy: 'ahbuys',
        withPrices: [{
          ticker,
          price: currentPrice
        }]
      })
    })
  );
};