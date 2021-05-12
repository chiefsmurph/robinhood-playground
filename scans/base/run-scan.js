const COUNT = 70;

const lookupMultiple = require('../../utils/lookup-multiple');
const addFundamentals = require('../../app-actions/add-fundamentals');
const allStocks = require('../../json/stock-data/allStocks');
const { isTradeable } = require('../../utils/filter-by-tradeable');
const getMinutesFromOpen = require('../../utils/get-minutes-from-open');
const getTrend = require('../../utils/get-trend');
const getStSent = require('../../utils/get-stocktwits-sentiment');
const queryGoogleNews = require('../../utils/query-google-news');

const Pick = require('../../models/Pick');
const getRecentPicksForTicker = require('../../utils/get-recent-picks-for-ticker');

const { uniq, get, mapObject } = require('underscore');
const { sumArray, avgArray, zScore } = require('../../utils/array-math');
const dayInProgress = require('../../realtime/day-in-progress');
const {
  getDailyHistoricals,
  addDailyHistoricals,
  addDailyRSI
} = require('../../realtime/historicals/add-daily-historicals');

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

const addQuotesToTickers = async tickers => {
  const tickQuotes = await lookupMultiple(tickers, true);
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

  // ticker filters
  minPrice = 0.5,
  maxPrice = 8,
  minDollarVolume = Number.NEGATIVE_INFINITY,
  minVolume = Number.NEGATIVE_INFINITY,
  maxVolume = Number.POSITIVE_INFINITY,

  tickers,

  filterFn = () => true,
  minDailyRSI = Number.NEGATIVE_INFINITY,
  maxDailyRSI = Number.POSITIVE_INFINITY,
  count = COUNT,
  excludeTickers = [],
  afterHoursReset = false,


  includeStSent = true,
  includeGoogleNews = false,
  includeRecentPicks = false,
  detailed = true,
} = {}) => {

  if (tickers) {
    count = Math.max(count, tickers.length);
  }

  tickers = tickers ? await addQuotesToTickers(tickers) : await getTickersBetween(minPrice, maxPrice);
  tickers = tickers.map(buy => ({
    ...buy,
    computed: {}
  })).filter(({ ticker }) => !excludeTickers.includes(ticker));

  const withFundamentals = (await addFundamentals(tickers)).filter(buy => buy.fundamentals);

  // .sort((a, b) => b.fundamentals.volume - a.fundamentals.volume)
  // .cutBottom();

  strlog({
    tickers: tickers.length,
    withFundamentals: withFundamentals.length
  })
  
  const min = getMinutesFromOpen();
  const percComplete = Math.max(Math.min(1, min / 390), 0.01);
  // console.log({
  //   min,
  //   percComplete
  // });
  const withProjectedVolume = withFundamentals
    .filter(buy => buy.fundamentals && buy.quote)
    .map(buy => {
      const projectedVolume = buy.fundamentals.volume / percComplete;
      const avgPrice = avgArray([
        buy.fundamentals.open,
        buy.fundamentals.low,
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
  const withoutLowVolume = tickers.length ? fourLettersOrLess : sortAndCut(fourLettersOrLess, 'computed.projectedVolume', fourLettersOrLess.length * 3 / 4);

  const irregularHours = !dayInProgress();
  const withTSO = withoutLowVolume
    .map(buy => ({
      ...buy,
      computed: {
        ...buy.computed,
        tso: getTrend(
          buy.quote.currentPrice, 
          //irregularHours && afterHoursReset ? buy.quote.lastTradePrice : 
          buy.fundamentals.open
        ),
        tsc: getTrend(
          buy.quote.currentPrice,
          //irregularHours && afterHoursReset ? buy.quote.lastTradePrice : 
          buy.quote.prevClose
        ),
        tsh: getTrend(buy.quote.currentPrice, buy.fundamentals.high)
      }
    }))
    .map(buy => ({
      ...buy,
      computed: {
        ...buy.computed,
        highestTrend: Math.max(Math.abs(buy.computed.tsc), Math.abs(buy.computed.tso), Math.abs(buy.computed.tsh)),
      }
    }));

  // strlog({
  //   withTSO
  // })

  const filtered = withTSO.filter(buy => filterFn(buy.computed));
  
  // FIX MISSING 2 WEEK VOLUMES
  const missing2WeekAvg = filtered
    .filter(buy => !buy.fundamentals.average_volume_2_weeks)
    .map(({ ticker }) => ticker);
  
  // strlog({
  //   missing2WeekAvg
  // });

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
        projectedVolumeTo2WeekAvg: Math.min(500, buy.computed.projectedVolume / buy.fundamentals.average_volume_2_weeks).twoDec(),
      }
    }))
    .filter(buy => {
      // console.log(buy.computed.projectedVolumeTo2WeekAvg, !!buy.computed.projectedVolumeTo2WeekAvg, !!buy.computed.projectedVolumeTo2WeekAvg && isFinite(buy.computed.projectedVolumeTo2WeekAvg))
      return !!buy.computed.projectedVolumeTo2WeekAvg && isFinite(buy.computed.projectedVolumeTo2WeekAvg);
    })
    .filter(buy => {
      const { average_volume_2_weeks } = buy.fundamentals;
      const { projectedVolume, dollarVolume } = buy.computed;
      const passesVolumeCheck = [average_volume_2_weeks, projectedVolume].every(val =>
        val >= minVolume && val <= maxVolume
      );
      const passesDollarVolumeCheck = dollarVolume > minDollarVolume;
      return passesVolumeCheck && passesDollarVolumeCheck;
    });


  const topVolTo2Week = sortAndCut(fixed, 'computed.projectedVolumeTo2WeekAvg', count / 3);
  // const topDollarVolume = sortAndCut(fixed, 'computed.dollarVolume', 30, COUNT / 3);
  const topVolTickers = sortAndCut(fixed, 'computed.projectedVolume', count);

  const volumeTickers = uniq([
    ...topVolTo2Week,
    ...topVolTickers,
  ], 'ticker');
  
  strlog({

    withProjectedVolume: withProjectedVolume.length,
    fourLettersOrLess: fourLettersOrLess.length,
    withoutLowVolume: withoutLowVolume.length, 
    
    filtered: filtered.length,
    fixed: fixed.length,

    topVolTickers: topVolTickers.length,
    topVolTo2Week: topVolTo2Week.length,
    // topDollarVolume: topDollarVolume.length,
    volumeTickers: volumeTickers.length,
  });
  


  let theGoodStuff = volumeTickers.slice(0, count);
  const withDailyHistoricals = await addDailyHistoricals(theGoodStuff);
  const withDailyRSI = addDailyRSI(withDailyHistoricals)
  
  theGoodStuff = withDailyRSI.filter(({ computed: { dailyRSI } }) => dailyRSI >= minDailyRSI && dailyRSI <= maxDailyRSI);

    
  console.log({
    theGoodStuff: theGoodStuff.length,
  })

  console.log({ includeGoogleNews });
  if (includeGoogleNews) {
    theGoodStuff = await mapLimit(theGoodStuff, 3, async buy => ({
      ...buy,
      gNews: await queryGoogleNews(buy.ticker, 6)
    }));
  }

  console.log({ includeRecentPicks })
  if (includeRecentPicks) {
    theGoodStuff = await mapLimit(theGoodStuff, 3, async buy => {
      const recentPicks = await getRecentPicksForTicker({
        ticker: buy.ticker
      });
      console.log({ recentPicks })
      const singlePick = (await getRecentPicksForTicker({ ticker: buy.ticker, limit: 1 }))[0];
      console.log({ singlePick });
      return {
        ...buy,
        recentPicks,
        singlePick
      };
    });
  }


  const realtimeRunner = require('../../realtime/RealtimeRunner');
  if (realtimeRunner) {
    theGoodStuff = theGoodStuff.map(position => {
      const rsiVals = {
        fiveMinuteRSI: realtimeRunner.getCurrentRSI(position.ticker),
        tenMinuteRSI: realtimeRunner.getCurrentRSI(position.ticker, '10'),
        thirtyMinuteRSI: realtimeRunner.getCurrentRSI(position.ticker, '30'),
      };
      return {
        ...position,
        computed: {
          ...position.computed,
          ...rsiVals
        },
      };
    });
  }

  const withStSent = includeStSent ? await mapLimit(theGoodStuff, 3, async buy => {
    const fullStSent = await getStSent(buy.ticker) || {};
    return {
      ...buy,
      fullStSent,
      computed: {
        ...buy.computed,
        stSent: fullStSent.bullBearScore
      }
    };
  }) : theGoodStuff;

  const withRecentPickTrend = await addRecentPickTrend(withStSent);

  return finalize(addZScores(withRecentPickTrend), detailed);

};

const addRecentPickTrend = async trend => {
  const getRecentPicks = require('../../app-actions/get-recent-picks');
  const recentPicks = await getRecentPicks(500, true, false, undefined, true);
  strlog({ recentPicks });
  return trend.map(buy => ({
    ...buy,
    computed: {
      ...buy.computed,
      recent500PickTrend: (recentPicks.find(p => p.ticker === buy.ticker) || {}).trend
    }
  }));
};



const addZScores = array => {
  // strlog({
  //   array
  // })
  const withZScores = array.map((buy, index, arr) => ({
    ...buy,
    zScores: [
      'projectedVolume',
      'projectedVolumeTo2WeekAvg',
      'stSent',
      'highestTrend',
      'dailyRSI',
      'fiveMinuteRSI',
      'tenMinuteRSI',
      'thirtyMinuteRSI',
      'recent500PickTrend',

      'tso',
      'tsc',
      'tsh'
    ].reduce((acc, key) => ({
      ...acc,
      [key]: zScore(
        arr.map(b => b.computed[key]).filter(Boolean),
        buy.computed[key]
      ).twoDec()
    }), {})
  }));

  // strlog({
  //   withZScores
  // })

  return withZScores;
};


const calcZscoreOffset = buy => {
  const {
    projectedVolumeTo2WeekAvg
  } = buy.zScores;
  const {
    projectedVolumeTo2WeekAvg,
    recent500PickTrend,
    stSent,
    tsh,
    tsc,
  } = buy.computed;


  const rsiKeys = Object.keys(buy.computed)
    .filter(key => key.toLowerCase().includes('rsi'));
  const rsiVals = rsiKeys.map(key => buy.computed[key]).filter(Boolean);
  const rsiOffset = rsiVals.filter(rsi => rsi < 30).length * 10; // 0-40
  const recentPickTrendOffset = recent500PickTrend < -15 && Math.abs(-15 - recent500PickTrend); //if trend is -50 then 0-35
  const stSentOffset = Math.round(stSent > 280 && (stSent - 280) / 8); // if max is 600 then 0-40
  const volumeOffset = projectedVolumeTo2WeekAvg > 2 && projectedVolumeTo2WeekAvg * 4;  // if max is 5 then 0-20
  const tshOffset = tsh < -10 && Math.abs(tsh);
  const tscOffset = tsc < -40 && Math.abs(tsc) - 40;
  return {
    offsets: {
      rsiOffset,
      recentPickTrendOffset,
      stSentOffset,
      volumeOffset,
      tshOffset,
      tscOffset,
    },
    zScoreOffset: sumArray([
      rsiOffset,
      recentPickTrendOffset,
      stSentOffset,
      volumeOffset,
      tshOffset,
      tscOffset,
    ])
  }
};


const finalize = (array, detailed) => {
  

  return array
    .map(buy => {


      const {
        projectedVolume,
        projectedVolumeTo2WeekAvg,
        stSent,
        highestTrend,
        dailyRSI,
        fiveMinuteRSI,
        tenMinuteRSI,
        thirtyMinuteRSI,
        recent500PickTrend,

        tso,
        tsc,
        tsh
      } = buy.zScores;


      // high volume
      const zScoreVolume = avgArray([
        projectedVolume,
        projectedVolumeTo2WeekAvg
      ]);   
      
      
      // high stSent, low movement
      const zScoreInverseTrend = stSent - highestTrend;

      // high stSent, low dailyRSI
      const zScoreHighSentLowRSI = stSent - dailyRSI - fiveMinuteRSI - thirtyMinuteRSI + recent500PickTrend;
      

      // high stSent, low movement, low dailyRSI
      const zScoreInverseTrendMinusRSI = (stSent * 1.4) - highestTrend - dailyRSI;
      
      
      // high stSent, low movement, high volume
      const zScoreInverseTrendPlusVol = zScoreInverseTrend + zScoreVolume;

      // high stSent, high volume, low movement low fiveMinuteRSI, low dailyRSI
      const zScoreMagic = (() => {

        const howHot = dailyRSI + highestTrend;
        const wantLow = howHot + fiveMinuteRSI + tenMinuteRSI + thirtyMinuteRSI + recent500PickTrend;
        const wantHigh = stSent + zScoreVolume;
        return wantHigh - wantLow;

      })();

      // high stSent * 2, high volume * 1, low dailyRSI * 3
      const zScoreHotAndCool = (() => {

        const wantLow = (dailyRSI * 3) + (fiveMinuteRSI * 2) + thirtyMinuteRSI + tenMinuteRSI + recent500PickTrend;
        const wantHigh = (stSent * 2) + zScoreVolume;
        return wantHigh - wantLow;

      })();

      // high stSent, trending down
      const zScoreGoingBadLookingGood = (() => {
        
        const worstNumber = Math.min(tso, tsc);
        return stSent - (worstNumber * 1.2);

      })();


      const zScoreCalcs = mapObject({
        zScoreVolume,
        zScoreInverseTrend,
        zScoreInverseTrendMinusRSI,
        zScoreInverseTrendPlusVol,
        zScoreHighSentLowRSI,
        zScoreMagic,
        zScoreHotAndCool,
        zScoreGoingBadLookingGood
      }, n => n.twoDec());


      const zScoreCalcSum = sumArray(Object.values(zScoreCalcs)) + projectedVolumeTo2WeekAvg;


      const offsetData = calcZscoreOffset(buy);
      const zScoreSum = zScoreCalcSum + offsetData.zScoreOffset;

      delete buy.historicals;
      return {

        ...detailed && { ...buy },


        ticker: buy.ticker,
        ...buy.computed,

        zScores: buy.zScores,
        ...zScoreCalcs,


        zScoreCalcSum,
        ...offsetData,
        zScoreSum,
        
      };
    })
    .map(buy => ({
      ...buy,
      stTrendRatio: (buy.stSent / buy.highestTrend).twoDec(),
    }))
    .sort((a, b) => b.zScoreInverseTrendPlusVol - a.zScoreInverseTrendPlusVol);


};





module.exports = runScan;