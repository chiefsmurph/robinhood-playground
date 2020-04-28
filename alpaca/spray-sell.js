const lookup = require('../utils/lookup');
const marketSell = require('./market-sell');
const { range } = require('underscore')
module.exports = async ({
  ticker,
  quantity
} = {
  ticker: 'QEP',
  quantity: 100
}) => {

  const { bidPrice, askPrice, lastTrade } = await lookup(ticker);
  const amt = quantity * lastTrade;




  const sharesAtATime = Math.min(5, quantity);
  const qAmts = [];
  let qLeft = quantity;
  while (qLeft > 0) {
    const q = Math.min(sharesAtATime, qLeft);
    qAmts.push(q);
    qLeft = qLeft - q;
  }

  strlog({ qAmts })
  const numShots = qAmts.length;
  
  const NUM_SECONDS_TOTAL = 60 * 1.5;
  const numMs = NUM_SECONDS_TOTAL * 1000;
  const spaceApart = numMs / numShots;

  const delayAmts = range(numShots).map(i => i * spaceApart);

  strlog({ delayAmts });


  return Promise.all(
    delayAmts.map(async (delay, index) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return marketSell({ ticker, quantity: qAmts[index] })
    })
  );

};