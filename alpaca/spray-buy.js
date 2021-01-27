const lookup = require('../utils/lookup');
const attemptBuy = require('./attempt-buy');
const limitBuy = require('./limit-buy');
const { range } = require('underscore');
const Log = require('../models/Log');
const { response } = require('express');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const getTrend = require('../utils/get-trend');

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


const getRandom = (min = 1, max = 10) => 
  Math.floor(Math.random() * (max - min + 1) + min)

module.exports = async ({
  ticker,
  quantity,
  numSeconds = NUM_SECONDS_TOTAL
} = {
  ticker: 'NAKD',
  quantity: 50000
}) => {

  const { bidPrice, askPrice, lastTrade: startPrice } = await lookup(ticker);
  const amt = quantity * startPrice;

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
  let madeAMove = false;
  for (let i of range(numShots)) {
    const quantity = qAmts[i];
    const { lastTrade: nowPrice } = await lookup(ticker);
    console.log(`spray buying ${i+1} of ${numShots} - ${quantity} shares`);
    const currentlyMoveMade = getTrend(nowPrice, startPrice) > 4;
    if (madeAMove !== currentlyMoveMade) {
      await log(`woah woah during a spray some move made maybe? ${ticker} throwing limits`, { startPrice, nowPrice });
    }
    madeAMove = currentlyMoveMade;
    const min = getMinutesFromOpen();
    if (madeAMove) {
      const timeoutMinutes = Math.min(
        min < 390 ? 390 - min : 510 - min, // dont wait for longer than the close
        getRandom(
          30,         // min = 30 minutes
          60 * 3.5,   // max = 3.5hrs
        )
      );
      response.push(
        limitBuy({
          ticker,
          quantity,
          limitPrice: nowPrice * (getRandom(9600, 9800) / 10000), // lower please
          timeoutSeconds: timeoutMinutes * 60,  // bc expecting seconds,
          fallbackToMarket: true
        })
      );
    } else {
      responses.push(
        attemptBuy({
          ticker, 
          quantity,
          fallbackToMarket: true 
        })
      );
    }
    await new Promise(resolve => setTimeout(resolve, spaceApart));
  }

  await log(`done spray buying ${ticker}`);
  return responses;

};