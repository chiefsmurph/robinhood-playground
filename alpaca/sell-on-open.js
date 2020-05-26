const getPositions = require('./get-positions');
const { alpaca } = require('.');
const { continueDownForDays } = require('../settings');

module.exports = async () => {
  const positions = await getPositions();
  strlog({ positions});

  const ofInterest = positions.filter(p => p.ticker !== 'LK');
  for (let p of ofInterest) {
    const { ticker, quantity } = p;
    const qToSell = quantity//Math.floor(Number(quantity) * 0.05);
    if (!qToSell) continue;
    await alpaca.createOrder({
      symbol: ticker, // any valid ticker symbol
      qty: Number(qToSell),
      side: 'sell',
      type: 'market',
      // ...extendedHours ? {
          // extended_hours: true,
          time_in_force: 'opg',
      // } : {
      //     time_in_force: 'day'
      // }
    }).catch(console.error);
    await log(`put ${qToSell} shares of ${ticker} out to sell at market open... good luck!`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
};