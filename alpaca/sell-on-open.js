const getPositions = require('./get-positions');
const { alpaca } = require('.');
const { defaultPercToSellAtOpen } = require('../settings');
const alpacaAttemptSell = require('./attempt-sell')

const definedPercent = {
  TUES: 35,
};

module.exports = async () => {
  const positions = await getPositions();
  strlog({ positions});

  const ofInterest = positions.filter(p => !p.wouldBeDayTrade);
  for (let p of ofInterest) {
    let { ticker, quantity, percToSell, returnPerc, stSent: { stBracket } = {} } = p;
    
    let actualPercToSell = (() => {
      if (percToSell === 100) return percToSell;
      if (definedPercent[ticker]) return definedPercent[ticker];
      return defaultPercToSellAtOpen;
    })();

    if (returnPerc < 0) {
      actualPercToSell = actualPercToSell / 1.5;
    }

    const stMultiplier = {
      bullish: 0.8,
      bearish: 1.5
    }[stBracket] || 1;

    actualPercToSell = actualPercToSell * stMultiplier;

    actualPercToSell = Math.min(actualPercToSell, 100);

    const qToSell = Math.max(1, Math.floor(Number(quantity) * (actualPercToSell / 100) ));
    const halfQ = Math.ceil(qToSell / 2);
    await alpaca.createOrder({
      symbol: ticker, // any valid ticker symbol
      qty: halfQ,
      side: 'sell',
      type: 'market',
      time_in_force: 'opg',
    }).catch(console.error);
    alpacaAttemptSell({
      ticker,
      quantity: halfQ,
      fallbackToMarket: true,
    });
    await log(`selling ${qToSell} shares of ${ticker} (${actualPercToSell}%) out to sell - half attempt, half at market open... good luck!`, {
      ticker,
      stMultiplier,
      qToSell,
      actualPercToSell
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
};