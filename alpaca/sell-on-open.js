const getPositions = require('./get-positions');
const { alpaca } = require('.');
const { continueDownForDays } = require('../settings');

module.exports = async () => {
  const positions = await getPositions();
  strlog({ positions});

  const ofInterest = positions.filter(p => !p.wouldBeDayTrade);
  for (let p of ofInterest) {
    const { ticker, quantity, percToSell } = p;
    const qToSell = percToSell === 100 
      ? quantity 
      : Math.max(1, Math.floor(Number(quantity) * 0.15));
    await alpaca.createOrder({
      symbol: ticker, // any valid ticker symbol
      qty: Number(qToSell),
      side: 'sell',
      type: 'market',
      time_in_force: 'opg',
    }).catch(console.error);
    await log(`put ${qToSell} shares of ${ticker} out to sell at market open... good luck!`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
};