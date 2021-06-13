const fs = require('mz/fs');
const getTrend = require('../../utils/get-trend');
const cTable = require('console.table');

module.exports = async () => {
  let allTickers = await fs.readdir(`./tests/sep-30/data`);
  const analysis = [];
  for (let ticker of allTickers) {
    console.log(ticker)
    const file = `./tests/sep-30/data/${ticker}`;
    const json = JSON.parse(await fs.readFile(file, 'utf8'));
    strlog({ json });
    const {
      alpacaOrder: {
        filled_avg_price: sellPrice
      },
      attemptNum,
      currentPosition: {
        quantity,
        average_buy_price: buyPrice,
        buyStrategies
      }
    } = json;
    analysis.push({
      ticker,
      buyPrice,
      sellPrice,
      quantity,
      returnDollars: (sellPrice - buyPrice) * quantity,
      returnPerc: getTrend(sellPrice, buyPrice),
      attemptNum,
      buyStrategies: Object.keys(buyStrategies).join(' ')
    });
    strlog({ json })
  }

  console.table(analysis);
};