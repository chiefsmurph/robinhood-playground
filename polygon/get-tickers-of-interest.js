const request = require('request-promise');
const { alpaca: { keyId }, tiingo: { token } } = require('../config');
const getBars = require('./get-bars');
const cacheThis = require('../utils/cache-this');

const MAX_PRICE = 12;

export default cacheThis(async () => {
  const iexEverything = JSON.parse(await request(`https://api.tiingo.com/iex/?token=${token}`));
  const cheapPriced = iexEverything.filter(({ tngoLast }) => tngoLast < MAX_PRICE);
  const tickers = cheapPriced.map(t => t.ticker);
  const fiveMinBars = await getBars(tickers);

  const combined = tickers.map(ticker => ({
    ticker,
    historicals: fiveMinBars[ticker]
  }));

  const hasData = combined.filter(({ historicals }) =>
    historicals && historicals.length > 10 && historicals[0] && Object.keys(historicals[0]).length
  );

  const getMostCommonTS = (getHist = historicals => historicals[0]) => {
    const tsCounts = hasData
      .map(({ historicals }) =>
        (getHist(historicals) || {}).startEpochTime
      )
      .filter(Boolean)
      .reduce((acc, TS) => ({
        ...acc,
        [TS]: Number(acc[TS] || 0) + 1
      }), {});
    strlog({ tsCounts })
    return Number(Object.keys(tsCounts).sort((a, b) => tsCounts[b] - tsCounts[a])[0]);
  };

  // const mostCommonFirst = getMostCommonTS(historicals => historicals[0]);
  const mostCommonLast = getMostCommonTS(historicals => historicals[historicals.length - 1]);
  strlog({
    // mostCommonFirst, 
    mostCommonLast 
  });
  return hasData.filter(({ historicals }) => {
    strlog({
      mostCommonLast,
      hist: historicals[historicals.length - 1],
      star: historicals[historicals.length - 1].startEpochTime,
      same: mostCommonLast === historicals[historicals.length - 1].startEpochTime
    })
    // historicals[0].startEpochTime === mostCommonFirst &&
    return historicals[historicals.length - 1].startEpochTime === mostCommonLast
  }).map(t => t.ticker);
  
}, 60 * 4);