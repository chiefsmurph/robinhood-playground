const addFundamantals = require('../app-actions/add-fundamentals');
const lookupMultiple = require('./lookup-multiple');
const { mapObject } = require('underscore');
const cacheThis = require('./cache-this');



const checkImportantData = importantData => {
  const checks = {
    'market cap under 50 million': ({ marketCap }) => marketCap < 50 * 1000000,
    'avg volume greater than 150k': ({ avgVolume }) => avgVolume > 150000,
    'avg volume less than 600k': ({ avgVolume }) => avgVolume < 600000,
    'current price less than $1.25': ({ currentPrice }) => currentPrice < 1.25,
    'current volume under 500k': ({ currentVolume }) => currentVolume < 500000,
    'relative volume under 0.75': ({ relativeVolume }) => relativeVolume < 0.75
  };
  const passedChecks = mapObject(
    checks,
    checkFn => checkFn(importantData)
  );
  return {
    passedChecks,
    isJimmyPick: Object.values(passedChecks).every(Boolean)
  };
};


export default cacheThis(async (tickers = 'BPMX') => {

  tickers = Array.isArray(tickers) ? tickers : tickers.split(',');

  try {

    const withFundamentals = await addFundamantals(
      tickers.map(ticker => ({ ticker }))
    );

    const quotes = await lookupMultiple(tickers);

    console.log({ quotes })

    const analyzed = withFundamentals.map(({ ticker, fundamentals }) => {
      const importantData = {
        marketCap: fundamentals.market_cap,
        avgVolume: fundamentals.average_volume || fundamentals.average_volume_2_weeks,
        currentVolume: fundamentals.volume,
        currentPrice: quotes[ticker]
      };
      importantData.relativeVolume = importantData.currentVolume / importantData.avgVolume;
      return {
        ticker,
        importantData,
        ...checkImportantData(importantData)
      };
    });

    return analyzed;

    // return analyzed.reduce((acc, { ticker, ...rest }) => ({
    //   ...acc,
    //   [ticker]: rest
    // }), {});

  } catch (e) {
    return [{
      error: e.toString()
    }];
  }
  
})