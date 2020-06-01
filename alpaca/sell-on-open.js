const getPositions = require('./get-positions');
const { alpaca } = require('.');
const { defaultPercToSellAtOpen } = require('../settings');


const definedPercent = {
  TUES: 53,
  MARK: 30,
  XTNT: 20,
  CIDM: 15
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

    if (stBracket === 'bearish') {
      actualPercToSell = stBracket * 1.5;
    }

    actualPercToSell = Math.min(actualPercToSell, 100);

    const qToSell = Math.max(1, Math.floor(Number(quantity) * (actualPercToSell / 100) ));
    await alpaca.createOrder({
      symbol: ticker, // any valid ticker symbol
      qty: Number(qToSell),
      side: 'sell',
      type: 'market',
      time_in_force: 'opg',
    }).catch(console.error);
    await log(`put ${qToSell} shares of ${ticker} (${actualPercToSell}%) out to sell at market open... good luck!`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
};