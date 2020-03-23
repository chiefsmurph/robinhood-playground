const { mapObject } = require('underscore');

const marketClosures = require('../../market-closures');
const formattedClosures = marketClosures.map(str => (new Date(str)).toLocaleDateString());

const rhHistoricals = require('./robinhood');
const tiingoHistoricals = require('./tiingo');
const dailyHistoricals = require('./daily');

module.exports = async (tickers, period, daysBack, includeAfterHours) => {

  console.log({ tickers, period, daysBack, includeAfterHours })
  const historicalMethods = {
    1: tiingoHistoricals,
    5: rhHistoricals,
    10: rhHistoricals,
    30: rhHistoricals,
    'd': dailyHistoricals
  };
  
  const removeClosures = historicalObj =>
    mapObject(
      historicalObj,
      hists => hists.filter(hist => {
        const histDate = (new Date(hist.timestamp)).toLocaleDateString();
        return formattedClosures.every(closure => histDate !== closure);
      })
    );

  return removeClosures(
    await historicalMethods[period](tickers, period, daysBack, includeAfterHours)
  );

};