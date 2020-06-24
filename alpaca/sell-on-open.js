const getPositions = require('./get-positions');
const { alpaca } = require('.');
const { maxPerPositionAfterOpenPerc } = require('../settings');
const alpacaAttemptSell = require('./attempt-sell')

const definedPercent = {
  DGLY: 20,
};

module.exports = async () => {
  const { equity } = await alpaca.getAccount();
  const maxPerPositionAfterSell = equity * (maxPerPositionAfterOpenPerc / 100);

  const positions = await getPositions();
  strlog({ positions});

  await log(`sell on open... maxPerPositionAfterSell: ${maxPerPositionAfterSell}`, { maxPerPositionAfterOpenPerc });

  const ofInterest = positions.filter(p => !p.wouldBeDayTrade);
  for (let p of ofInterest) {
    let { ticker, quantity, percToSell, returnPerc, stSent: { stBracket, bullBearScore } = {}, market_value, numMultipliers, avgMultipliersPerPick } = p;
    
    let actualPercToSell = (() => {
      if (percToSell === 100) return percToSell;
      if (definedPercent[ticker]) return definedPercent[ticker];
      return (1 - maxPerPositionAfterSell / Number(market_value)) * 100;
    })();
    
    if (actualPercToSell < 2) continue;

    // if (returnPerc < 0) {
    //   actualPercToSell = actualPercToSell / 1.5;
    // }

    if (bullBearScore > 280) {
      actualPercToSell = Math.min(80, bullBearScore);
    }

    const multPullback = (Math.floor(numMultipliers / 200) + Number(avgMultipliersPerPick > 150)) * 5;
    actualPercToSell = actualPercToSell * (100 - multPullback) / 100;

    const stMultiplier = {
      bullish: 0.85,
      bearish: 1.5
    }[stBracket] || 1;

    actualPercToSell = actualPercToSell * stMultiplier;

    actualPercToSell = Math.min(actualPercToSell, 100);

    const qToSell = Math.max(1, Math.floor(Number(quantity) * (actualPercToSell / 100) ));
    const halfQ = Math.ceil(qToSell / 2);
    const secondQ = qToSell - halfQ;
    await alpaca.createOrder({
      symbol: ticker, // any valid ticker symbol
      qty: halfQ,
      side: 'sell',
      type: 'market',
      time_in_force: 'opg',
    }).catch(console.error);
    secondQ && alpacaAttemptSell({
      ticker,
      quantity: secondQ,
      fallbackToMarket: true,
    });
    await log(`selling ${qToSell} shares of ${ticker} (${actualPercToSell}%) out to sell - half attempt, half at market open... good luck! multPullback ${multPullback} stMultiplier ${stMultiplier}`, {
      ticker,
      stMultiplier,
      qToSell,
      actualPercToSell,
      multPullback,
      numMultipliers,
      avgMultipliersPerPick
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
};