const getRhStocks = async rhTag => {
  console.log(`getting robinhood ${rhTag} stocks`);
  const {
      instruments: top100RHinstruments
  } = await Robinhood.url(`https://api.robinhood.com/midlands/tags/tag/${rhTag}/`);
  let top100RHtrend = await mapLimit(top100RHinstruments, 3, async instrumentUrl => {
      const instrumentObj = await Robinhood.url(instrumentUrl);
      return {
          ...instrumentObj,
          instrumentUrl,
          ticker: instrumentObj.symbol
      };
  });
  return top100RHtrend.map(t => t.ticker);
};

const getStocktwitsSentiment = require('../utils/get-stocktwits-sentiment');

const runScan = require('../scans/base/run-scan');

module.exports = async () => {
  // const top100 = await getRhStocks('100-most-popular');
  // strlog({ top100});

  const scanResults = await runScan({ 
    // tickers: top100,
    minPrice: 10,
    maxPrice: Number.POSITIVE_INFINITY,
    minVolume: 250000,
    count: 300,
    filterFn: ({
      tso, tsc
    }) => [tso, tsc].every(val => val > 0 && val < 1),
    afterHoursReset: false
  });

  return scanResults;
};