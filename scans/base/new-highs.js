const COUNT = 3;
const PERIODS = [30, 90, 120, 360];


const lookupMultiple = require('../../utils/lookup-multiple');
const addFundamentals = require('../../app-actions/add-fundamentals');
const allStocks = require('../../json/stock-data/allStocks');
const { isTradeable } = require('../../utils/filter-by-tradeable');
const getMultipleHistoricals = require('../../app-actions/get-multiple-historicals');
const getMinutesFromOpen = require('../../utils/get-minutes-from-open');
const getTrend = require('../../utils/get-trend');
const getStSent = require('../../utils/get-stocktwits-sentiment');
const { uniq, get, mapObject, pick } = require('underscore');
const { avgArray, zScore } = require('../../utils/array-math');

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


const sortAndCut = (arr, sortKey, num) => {
  return arr
    .filter(buy => get(buy, sortKey))
    .sort((a, b) => {
      // console.log({
      //   b: get(b, sortKey),
      //   a: get(a, sortKey)
      // })
      return get(b, sortKey) - get(a, sortKey);
    })
    .slice(0, num)
};


const runScan = async ({
  minPrice = 0.5,
  maxPrice = 8,
  minVolume = Number.NEGATIVE_INFINITY,
  includeStSent = true
} = {}) => {
  
  strlog('get tickers between prices....')
  const tickers = (await getTickersBetween(minPrice, maxPrice)).map(buy => ({
    ...buy,
    computed: {}
  }));

  strlog('add fundamentals....')
  const withFundamentals = await addFundamentals(tickers);

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
        buy.quote.currentPrice
      ]);
      return {
        ...buy,
        computed: {
          ...buy.computed,
          actualVolume: buy.fundamentals.volume,
          dollarVolume: Math.round(buy.fundamentals.volume * avgPrice),
          projectedVolume: projectedVolume.twoDec(),
          // projectedVolumeTo2WeekAvg: (projectedVolume / twoWeekAvgVol).twoDec(),
          // projectedVolumeToOverallAvg: projectedVolume / buy.fundamentals.average_volume,
        }
      };
    });
  
  const fourLettersOrLess = withProjectedVolume.filter(({ ticker }) => ticker.length <= 4);
  const withoutLowVolume = sortAndCut(fourLettersOrLess, 'computed.projectedVolume', fourLettersOrLess.length * 8 / 9);

  const isPremarket = min < 0;
  const isAfterHours = min > 390;
  const irregularHours = isPremarket || isAfterHours;
  const withTSO = withoutLowVolume
    .map(buy => ({
      ...buy,
      computed: {
        ...buy.computed,
        tso: getTrend(
          buy.quote.currentPrice, 
          !irregularHours ? buy.fundamentals.open : buy.quote.lastTradePrice
        ),
        tsc: getTrend(
          buy.quote.currentPrice, 
          !irregularHours ? buy.quote.prevClose : buy.quote.lastTradePrice
        ),
        tsh: getTrend(buy.quote.currentPrice, buy.fundamentals.high),
        tsl: getTrend(buy.quote.currentPrice, buy.fundamentals.low),
      }
    }))
    .map(buy => ({
      ...buy,
      computed: {
        ...buy.computed,
        highestTrend: Math.max(Math.abs(buy.computed.tsc), Math.abs(buy.computed.tso), Math.abs(buy.computed.tsh)),
      }
    }));

    

  const filtered = withTSO
    .filter(buy => buy.computed.projectedVolume > minVolume)
    // .filter(buy => filterFn(buy.computed));
  
  // FIX MISSING 2 WEEK VOLUMES
  const missing2WeekAvg = filtered
    .filter(buy => !buy.fundamentals.average_volume_2_weeks)
    .map(({ ticker }) => ticker);
  
  strlog({
    missing2WeekAvg
  });
  
  const missingDailyHistoricals = await getDailyHistoricals(missing2WeekAvg);


  const fixed = filtered
    .map(buy => ({
      ...buy,
      fundamentals: {
        ...buy.fundamentals,
        average_volume_2_weeks: buy.fundamentals.average_volume_2_weeks || (() => {
          const dailyHistoricals = missingDailyHistoricals[buy.ticker];
          const calcedAvgVol = avgArray(dailyHistoricals.slice(-10).map(hist => hist.volume));
          console.log('fixing 2 week volume for', buy.ticker, calcedAvgVol);
          return calcedAvgVol;
        })()
      }
    }))
    .map(buy => ({
      ...buy,
      computed: {
        ...buy.computed,
        projectedVolumeTo2WeekAvg: (buy.computed.projectedVolume / buy.fundamentals.average_volume_2_weeks).twoDec(),
      }
    }))
    .filter(buy => {
      console.log(buy.computed.projectedVolumeTo2WeekAvg, !!buy.computed.projectedVolumeTo2WeekAvg, !!buy.computed.projectedVolumeTo2WeekAvg && isFinite(buy.computed.projectedVolumeTo2WeekAvg))
      return !!buy.computed.projectedVolumeTo2WeekAvg && isFinite(buy.computed.projectedVolumeTo2WeekAvg);
    });

  strlog('add daily historicals....');
  
  const withDailys = await addDailyHistoricals(fixed);

  strlog('finding new highs....')

  // strlog({
  //   withDailys: withDailys.map(b => b.ticker)
  // })
  // strlog({ withHighs });
  const withStreakCounts = withDailys.map(buy => {
    const { quote, fundamentals, dailyHistoricals } = buy;
    const { currentPrice, prevClose } = quote;
    const { open } = fundamentals;


    const historicalsFormatted = [
      {
        currentPrice,
        open,
        prevClose,
      },
      ...dailyHistoricals.slice().reverse().map((hist, index, arr) => {
        const prevHist = arr[index + 1];
        return {
          open: hist.open_price,
          high: hist.high_price,
          close: hist.close_price,
          prevClose: (prevHist || {}).close_price
        };
      })
    ];


    // strlog({ ticker: buy.ticker });
    // strlog({ historicalsFormatted })

    const streakCounts = PERIODS.reduce((acc, period) => {

      period = Number(period);
      const streakCount = historicalsFormatted.findIndex((hist, index, arr) => {
        const histSubset = arr.slice(index).slice(0, period);
        
        const {
          currentPrice,
          close,
          open,
          prevClose
        } = histSubset.shift();
        const high = Math.max(
          ...histSubset.map(hist => hist.high)
        );

        const compareVal = currentPrice || high;
        // strlog({
        //   ticker: buy.ticker,
        //   period,
        //   index,
        //   // histSubset: histSubset.length,
        //   compareVal,
        //   high
        // })
        const aboveHigh = val => val > high;
        const breakingHigh = aboveHigh(compareVal) && ([open, prevClose].some(val => !aboveHigh(val)));
        // if (buy.ticker === 'ARDX' && period === 360) {
        //   strlog({
        //     // streakCount,
        //     compareVal,
        //     high,
        //     breakingHigh
        //   })
        // }
        return !breakingHigh;
      });

      

      return {
        ...acc,
        [period]: streakCount
      };

    }, {});

    const biggestBreakPeriod = PERIODS
      .slice()
      .reverse()
      .find(period => 
        streakCounts[period] > 0
      );

    const biggestBreak = biggestBreakPeriod ? {
      period: Number(biggestBreakPeriod),
      streak: streakCounts[biggestBreakPeriod]
    } : undefined;

    return {
      ...buy,
      computed: {
        ...buy.computed,
        biggestBreak
      }
    }
  });

  // strlog({
  //   withHitCounts
  // })

  const breakingHighs = withStreakCounts.filter(buy => buy.computed.biggestBreak);



  // strlog({ breakingHighs });

  PERIODS.forEach(period => {
    strlog({
      [period]: breakingHighs
        .filter(buy => buy.computed.biggestBreak.period === Number(period))
        .map(buy => ({
          ticker: buy.ticker,
          streak: buy.computed.biggestBreak.streak
        }))
    })
  });

  return breakingHighs
    .map(buy => ({
      ticker: buy.ticker,
      currentPrice: buy.quote.currentPrice,
      ...buy.computed.biggestBreak, // period & streak
    }))
    .sort((a, b) => b.period - a.period);


};


const getDailyHistoricals = async tickers => {
  let allHistoricals = await getMultipleHistoricals(
    tickers
    // `interval=day`
  );

  let tickersToHistoricals = tickers.reduce((acc, ticker, index) => ({
    ...acc,
    [ticker]: allHistoricals[index]
  }), {});

  return tickersToHistoricals;

};

const addDailyHistoricals = async trend => {

  const tickers = trend.map(t => t.ticker);
  const tickersToHistoricals = await getDailyHistoricals(tickers);

  return trend.map(buy => ({
    ...buy,
    dailyHistoricals: tickersToHistoricals[buy.ticker]
  }))

};

module.exports = runScan;