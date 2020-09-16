const lookup = require('../utils/lookup');
const attemptBuy = require('./attempt-buy');
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

  if (spaceApart < 1000 * 90 || numShots > 30) {
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
  quantity: 50000
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

  await log(`starting to spray buy ${quantity} shares of ${ticker} (about $${Math.round(amt)})... shares at a time ${sharesAtATime} numShots ${numShots} seconds apart ${spaceApart / 1000}`);
  const responses = [];
  for (let i of range(numShots)) {
    await new Promise(resolve => setTimeout(resolve, spaceApart));
    const quantity = qAmts[i];
    console.log(`spray buying ${i+1} of ${numShots} - ${quantity} shares`);
    responses.push(
      attemptBuy({
        ticker, 
        quantity,
        fallbackToMarket: true 
      })
    ); 
  }

  return responses;

};