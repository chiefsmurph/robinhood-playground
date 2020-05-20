const getPositions = require('./get-positions');
const limitSell = require('./limit-sell');

module.exports = async () => {

  const positions = await getPositions(true);

  const ofInterest = positions.filter(pos => pos.sellOffDaysLeft > 0 && !pos.wouldBeDayTrade);

  for (let { ticker, currentPrice, quantity } of ofInterest) {
    await limitSell({
      ticker,
      limitPrice: currentPrice * 1.01,
      quantity: Math.ceil(quantity * .02),
      timeoutSeconds: Number.POSITIVE_INFINITY
    });
    await new Promise(resolve => setTimeout(resolve, 200));
    await limitSell({
      ticker,
      limitPrice: currentPrice * 1.02,
      quantity: Math.ceil(quantity * .05),
      timeoutSeconds: Number.POSITIVE_INFINITY
    });
    await new Promise(resolve => setTimeout(resolve, 200));
    await limitSell({
      ticker,
      limitPrice: currentPrice * 1.045,
      quantity: Math.ceil(quantity * .1),
      timeoutSeconds: Number.POSITIVE_INFINITY
    });
    await log(`hopeful ${ticker}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

}