const lookup = require('../utils/lookup');
const attemptSell = require('./attempt-sell');
const { range } = require('underscore');
const Log = require('../models/Log');

const NUM_SECONDS_TOTAL = 60 * 20;

const calculateQAmts = (quantity, numSeconds, sharesAtATime = 1) => {
  const qAmts = [];
  let qLeft = quantity;
  while (qLeft > 0) {
    const q = Math.min(sharesAtATime, qLeft);
    qAmts.push(q);
    qLeft = qLeft - q;
  }

  strlog({ qAmts })
  const numShots = qAmts.length;
  
  const numMs = numSeconds * 1000;
  const spaceApart = numMs / numShots;

  if (spaceApart < 1000 * 10) {
    return calculateQAmts(
      quantity, 
      numSeconds, 
      Math.min(
        quantity,
        Math.ceil(sharesAtATime * 1.3)
      )
    );
  }
  return {
    qAmts,
    spaceApart,
    numShots,
    sharesAtATime,
  };
};

module.exports = async ({
  ticker,
  quantity,
  numSeconds = NUM_SECONDS_TOTAL
} = {
  ticker: 'NAKD',
  quantity: 100
}) => {

  const { bidPrice, askPrice, lastTrade } = await lookup(ticker);
  const amt = quantity * lastTrade;


  const { 
    qAmts, 
    spaceApart, 
    numShots, 
    sharesAtATime 
  } = calculateQAmts(quantity, numSeconds);
  console.log({ secApart: spaceApart / 1000})
  // const delayAmts = range(numShots).map(i => i * spaceApart);

  // strlog({ delayAmts });

  await log(`starting to spray ${quantity} shares of ${ticker} (about $${Math.round(amt)})... shares at a time ${sharesAtATime} numShots ${numShots} spaceApart ${spaceApart}`);
  const responses = [];
  for (let i of range(numShots)) {
    const quantity = qAmts[i];
    console.log(`spraying ${i+1} of ${numShots} - ${quantity} shares`);
    if (await Log.boughtToday(ticker)) {
      console.log(`looks like we bought it today... no more spray action ${ticker}`);
      break;
    }
    await Promise.all([
      (async () => {
        const timeoutSeconds =  Math.min(spaceApart / 1000 * 0.8 , 20);
        console.log({ timeoutSeconds })
        responses.push(
          await attemptBuy({ 
            ticker, 
            quantity, 
            pickPrice: lastTrade, 
            timeoutSeconds, 
            fallbackToMarket: true 
          })
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