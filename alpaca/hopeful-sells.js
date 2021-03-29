const getPositions = require('./get-positions');
const limitSell = require('./limit-sell');


const STRENGTH = 1;
const timeoutSeconds = 60 * 20;

module.exports = async () => {
  
  const positions = await getPositions(true);

  const ofInterest = positions.filter(pos => pos.sellOffDaysLeft > 0 && !pos.wouldBeDayTrade & pos.returnPerc > 0 & pos.quantity > 5);

  for (let { ticker, currentPrice, quantity } of ofInterest) {
    await limitSell({
      ticker,
      limitPrice: currentPrice * 1.02,
      quantity: Math.ceil(quantity * .02 * STRENGTH),
      timeoutSeconds
    });
    await new Promise(resolve => setTimeout(resolve, 200));
    await limitSell({
      ticker,
      limitPrice: currentPrice * 1.03,
      quantity: Math.ceil(quantity * .05 * STRENGTH),
      timeoutSeconds
    });
    await new Promise(resolve => setTimeout(resolve, 200));
    await limitSell({
      ticker,
      limitPrice: currentPrice * 1.045,
      quantity: Math.ceil(quantity * .1 * STRENGTH),
      timeoutSeconds
    });
    await log(`hopeful ${ticker}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

}