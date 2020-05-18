const lookup = require('../utils/lookup');
const marketSell = require('./market-sell');
const { range } = require('underscore');
const Log = require('../models/Log');


module.exports = async ({
  ticker,
  quantity
} = {
  ticker: 'NAKD',
  quantity: 100
}) => {

  const { bidPrice, askPrice, lastTrade } = await lookup(ticker);
  const amt = quantity * lastTrade;




  const sharesAtATime = Math.min(20, quantity);
  const qAmts = [];
  let qLeft = quantity;
  while (qLeft > 0) {
    const q = Math.min(sharesAtATime, qLeft);
    qAmts.push(q);
    qLeft = qLeft - q;
  }

  strlog({ qAmts })
  const numShots = qAmts.length;
  
  const NUM_SECONDS_TOTAL = 60 * 20;
  const numMs = NUM_SECONDS_TOTAL * 1000;
  const spaceApart = numMs / numShots;
  console.log({ secApart: spaceApart / 1000})
  // const delayAmts = range(numShots).map(i => i * spaceApart);

  // strlog({ delayAmts });

  const responses = [];
  for (let i of range(numShots)) {
    const quantity = qAmts[i];
    console.log(`spraying ${i+1} of ${numShots} - ${quantity} shares`);
    // if (await Log.boughtToday(ticker)) {
    //   console.log(`looks like we bought it today... no more spray action ${ticker}`);
    //   break;
    // }
    await Promise.all([
      (async () => {
        const timeoutSeconds =  Math.min(spaceApart / 1000 * 0.8 , 20);
        console.log({ timeoutSeconds })
        responses.push(
          await marketSell({ ticker, quantity, timeoutSeconds })
        );
      })(),
      (async () => {
        const next = new Date(Date.now() + spaceApart);
        console.log(`next spray: ${next.toLocaleString()}`);
        await new Promise(resolve => setTimeout(resolve, spaceApart));
      })()
    ]);
    
  }

  return responses;

};