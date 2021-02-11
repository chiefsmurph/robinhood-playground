const lookup = require('../utils/lookup');
const attemptSell = require('./attempt-sell');
const { range } = require('underscore');
const Log = require('../models/Log');
const Hold = require('../models/Holds');

const NUM_SECONDS_TOTAL = 60 * 20;

const calculateQAmts = (quantity, numSeconds, sharesAtATime = 1, runCount = 0) => {
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

  if (runCount < 30 && (spaceApart < 1000 * 60 || numShots > 30)) {
    return calculateQAmts(
      quantity, 
      numSeconds, 
      Math.min(
        quantity,
        Math.ceil(sharesAtATime * 1.3)
      ),
      ++runCount
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

  console.log('spraysell', { ticker, quantity, numSeconds });
  const { 
    qAmts, 
    spaceApart, 
    numShots, 
    sharesAtATime 
  } = calculateQAmts(quantity, numSeconds);
  console.log({ secApart: spaceApart / 1000})
  // const delayAmts = range(numShots).map(i => i * spaceApart);

  // strlog({ delayAmts });
  await Hold.updateOne({ ticker }, { isSelling: true });
  
  await log(`starting to spray ${quantity} shares of ${ticker} (about $${Math.round(amt)})... shares at a time ${sharesAtATime} numShots ${numShots} spaceApart ${spaceApart / 1000} sec`);
  const responses = [];
  for (let i of range(numShots)) {
    if (await Log.boughtToday(ticker)) {
      await log(`looks like we bought it today... no more spray action ${ticker}`);
      break;
    }
    const quantity = qAmts[i];
    console.log(`spray selling ${i+1} of ${numShots} - ${quantity} shares`);
    responses.push(
      attemptSell({
        ticker, 
        quantity,
        fallbackToMarket: true 
      })
    ); 
    await new Promise(resolve => setTimeout(resolve, spaceApart));
  }
  
  await log(`done spray selling ${ticker}`);
  setTimeout(() => Hold.updateOne({ ticker }, { isSelling: false }), 1000 * 60 * 5);
  

  return responses;

};