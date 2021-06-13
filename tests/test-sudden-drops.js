const { handler } = require('../realtime/strategies/sudden-drops');
const getHistoricals = require('../realtime/historicals/get');
const getTrend = require('../utils/get-trend');

const fakeSuddenDrops = ({ allPrices }) => {
    const allCurrents = allPrices.slice().map(obj => obj.low_price);
    const mostRecent = allCurrents.pop();
    const min = Math.min(...allCurrents);
    const trendFromMin = getTrend(mostRecent, min);
    const bigJump = trendFromMin < -5;
    return trendFromMin;
};

const getCollections = require('../realtime/collections/get-collections');


module.exports = async (ticker = 'PSTV') => {
  
  const allTickers = Object.values(await getCollections()).flatten();


  const historicalObj = await getHistoricals(allTickers, 10, undefined, true);
  let hits = [];
  strlog({ allTickers })
  for (let [ticker, allPrices] of Object.entries(historicalObj)) {
    const mapped = Array(allPrices.length).fill(0).map((v, i) => i).map(i => ({
      i,
      trendFromMin: fakeSuddenDrops({
        allPrices: allPrices.slice(0, allPrices.length - i)
      }),
      closeTime: (new Date(allPrices[allPrices.length - i - 1].timestamp)).toLocaleString(),
      close_price: allPrices[allPrices.length - i - 1].close_price
    })).filter(a => a.trendFromMin < -10);
    hits = [
      ...hits,
      ...mapped.map(m => ({
        ...m,
        ticker
      }))
    ]
  }

  strlog({ hits })
  

};