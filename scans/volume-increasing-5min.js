const lookupMultiple = require('../utils/lookup-multiple');
const addFundamentals = require('../app-actions/add-fundamentals');
const allStocks = require('../json/stock-data/allStocks');
const { isTradeable } = require('../utils/filter-by-tradeable');
// const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const getTrend = require('../utils/get-trend');
const getStSent = require('../utils/get-stocktwits-sentiment');
const { uniq, get } = require('underscore');
const { avgArray } = require('../utils/array-math');
const getHistoricals = require('../realtime/historicals/get');

const getTickersBetween = async (min, max) => {
  const tickQuotes = await lookupMultiple(allStocks.filter(isTradeable).map(o => o.symbol), true);
  const tickers = Object.keys(tickQuotes).filter(ticker => {
    const { currentPrice } = tickQuotes[ticker];
    return currentPrice < max && currentPrice > min
  });
  // console.log({ kstTickers: tickers });
  return tickers.map(ticker => ({
    ticker,
    quote: tickQuotes[ticker]
  }));
};


module.exports = async ({  
  minPrice = 0.5,
  maxPrice = 8
} = {}) => {
  const tickers = (await getTickersBetween(minPrice, maxPrice)).map(buy => ({
    ...buy,
    computed: {}
  }));

  const withFundamentals = (
    await addFundamentals(
      tickers
    )
  );

  // .sort((a, b) => b.fundamentals.volume - a.fundamentals.volume)
  // .cutBottom();

    
  
  const min = getMinutesFromOpen();
  const percComplete = Math.max(Math.min(1, min / 390), 0.01);
  // console.log({
  //   min,
  //   percComplete
  // });
  const withProjectedVolume = withFundamentals
    .map(buy => {
      const projectedVolume = buy.fundamentals.volume / percComplete;
      const avgPrice = avgArray([
        buy.fundamentals.open,
        buy.fundamentals.low,
        buy.fundamentals.high,
        buy.fundamentals.high,
        buy.quote.prevClose,
        buy.quote.currentPrice
      ]);
      return {
        ...buy,
        computed: {
          ...buy.computed,
          actualVolume: buy.fundamentals.volume,
          dollarVolume: buy.fundamentals.volume * avgPrice,
          projectedVolume,
          projectedVolumeTo2WeekAvg: projectedVolume / buy.fundamentals.average_volume_2_weeks,
          projectedVolumeToOverallAvg: projectedVolume / buy.fundamentals.average_volume,
        }
      };
    })
    .filter(buy => buy.computed.projectedVolume > 25000);
  
  const sortAndCut = (arr, sortKey, percent, actuallyTop) => {
    return arr
      .filter(buy => get(buy, sortKey))
      .sort((a, b) => {
        // console.log({
        //   b: get(b, sortKey),
        //   a: get(a, sortKey)
        // })
        return get(b, sortKey) - get(a, sortKey);
      })
      .cutBottom(percent, actuallyTop)
  };

  const topVolTickers = sortAndCut(withProjectedVolume, 'computed.projectedVolume', 20, true);
  const topVolTo2Week = sortAndCut(withProjectedVolume, 'computed.projectedVolumeTo2WeekAvg', 25, true);
  const topVolToOverallAvg = sortAndCut(withProjectedVolume, 'computed.projectedVolumeToOverallAvg', 30, true);
  const topDollarVolume = sortAndCut(withProjectedVolume, 'computed.dollarVolume', 30, true);
  
  const volumeTickers = uniq([
    ...topVolTickers,
    ...topVolTo2Week,
    ...topVolToOverallAvg,
    ...topDollarVolume
  ], 'ticker');
  

  // strlog({ volumeTickers })
  const fiveMinuteHistoricals = await getHistoricals(volumeTickers.map(obj => obj.ticker), 5);
  // strlog({fiveMinuteHistoricals})

  const withFiveMinuteHistoricals = volumeTickers.map(buy => ({
    ...buy,
    fiveMinute: fiveMinuteHistoricals[buy.ticker].filter(hist => hist.session === 'reg')
  }));

  // strlog({ withFiveMinuteHistoricals })

  const onlyVolumeEverywhere = withFiveMinuteHistoricals.filter(buy => 
    buy.fiveMinute.every(hist => hist.volume > 200)
  );

  strlog({
    onlyVolumeEverywhere: onlyVolumeEverywhere.length
  })

  const withVolumeAnalysis = onlyVolumeEverywhere.map(buy => {

    const { fiveMinute } = buy;
    

    const getVolRatio = index => {
      const p1 = fiveMinute.slice(0, index);
      const p2 = fiveMinute.slice(index);

      const getAvgProp = (arr, prop) => avgArray(arr.map(hist => hist[prop]));
      const [p1Vol, p2Vol] = [p1, p2].map(arr => getAvgProp(arr, 'volume'));
      const [p1Trend, p2Trend] = [p1, p2].map(arr => getAvgProp(arr, 'trend'));
      const volRatio = p2Vol / p1Vol;
      const trendDiff = Math.max(...[p2Trend, p2Trend - p1Trend]);
      return volRatio;
    };

    const volRatios = [
      fiveMinute.length - 3,
      fiveMinute.length - 5,
      fiveMinute.length - Math.round(fiveMinute.length / 4),
      fiveMinute.length - Math.round(fiveMinute.length / 5),
      fiveMinute.length - Math.round(fiveMinute.length / 3),
    ].map(getVolRatio).filter(Boolean);

    // strlog({volRatios})
    const highestVolRatio = Math.max(...volRatios);
    // strlog({highestVolRatio})

    return {
      ...buy,
      computed: {
        ...buy.computed,
        highestVolRatio
      }
    }
  });

  const hits = withVolumeAnalysis
    .sort((a, b) => b.computed.highestVolRatio - a.computed.highestVolRatio)
    .filter(buy => buy.computed.highestVolRatio > 7.5)
    .map(({ ticker, computed }) => ({
      ticker,
      ...computed
    }))

  const withStSent = (
    await mapLimit(hits, 3, async buy => ({
      ...buy,
      stSent: (await getStSent(buy.ticker) || {}).bullBearScore
    }))
  );

  return withStSent;

  // strlog({historicals})
  // const withFiveMinHistoricals = await mapLimit(volumeTickers,) 
    

};


