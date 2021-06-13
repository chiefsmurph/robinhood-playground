const getHistoricals = require('../historicals/get');
const { handler: rsi } = require('../strategies/rsi');
const { handler: kst } = require('../strategies/kst');
const { handler: sma } = require('../strategies/sma');
const { handler: ema } = require('../strategies/ema');
const { handler: smoothKst } = require('../strategies/smooth-kst');
const getTrend = require('../../utils/get-trend');
const { avgArray, percUp } = require('../../utils/array-math');
const { mapObject, pick, get } = require('underscore');



// SETTINGS


const NUM_FOLLOWING_PERIODS_TO_ANALYZE = 14;


const trailingStopLoss = (startPrice, stopAtPerc) => {
  let min = startPrice;
  return ({ currentPrice }) => {
    min = Math.min(min, currentPrice);
    // strlog({
    //   max,
    //   currentPrice,
    //   stopAtPerc,
    //   trend: getTrend(currentPrice, max)
    // })
    return getTrend(currentPrice, min) > stopAtPerc;
  };
}

const sellWhen = (compareHist, buyHist, compareIndex) => {


  const trend = getTrend(
    compareHist.currentPrice,
    buyHist.currentPrice
  );

  // based on trend
  // return Math.abs(trend) > 1.5;


  // ema crossover bearish
  return compareIndex > 10 && (
    (compareHist.ema && compareHist.ema.bearishCross)
    // Math.abs(trend) > 5
  );

  // kst bearish cross
  return compareHist.kst && compareHist.kst.bearishSignal;

  // sma bearish cross
  return compareIndex >= 13 && compareHist.sma && compareHist.sma.bearishCross;


  // hold until end of next day
  const buyHistDate = new Date(buyHist.timestamp);
  const nextDay = new Date(histDate.getTime() + 1000 * 60 * 60 * 24).getDate();
  const compareDate = (new Date(compareHist.timestamp)).getDate();
  return compareDate > nextDay;
};





module.exports = async () => {
  let { SPY: thirtyHistoricals } = await getHistoricals(['SPY'], 30, 365);


  // strlog({
  //   thirtyHistoricals,
  //   fiveHistoricals
  // })

  thirtyHistoricals = thirtyHistoricals.map(hist => ({
    ...hist,
    dateFormatted: (new Date(hist.timestamp)).toLocaleString()
  }));

  console.log('first historical date: ', thirtyHistoricals[0].dateFormatted)
5
  let i = 0;
  const withStrategies = await mapLimit(thirtyHistoricals, 1, async hist => {
    console.log('analyzing', i, '/', thirtyHistoricals.length);
    const allPrices = thirtyHistoricals.slice(0, ++i);
    const rsiResponse = await rsi({ allPrices });
    const kstResponse = await kst({ allPrices });
    const smoothKstResponse = await smoothKst({ allPrices });
    const smaResponse = await sma({ allPrices });
    const emaResponse = await ema({ allPrices });
    // strlog({
    //   hist,
    //   allPrices,
    //   rsiResponse,
    //   kstResponse
    // });
    return {
      ...hist,
      rsi: rsiResponse ? rsiResponse.data.rsi : null,
      kst: kstResponse ? kstResponse.keys : null,
      smoothKstResponse: smoothKstResponse ? smoothKstResponse.keys : null,
      sma: smaResponse ? smaResponse.keys : null,
      ema: smaResponse ? emaResponse.keys : null
    };
  });


  strlog({
    smaBullishCrosses: withStrategies.filter(hist => hist.sma && hist.sma.bullishCross).map(hist => hist.dateFormatted),
    smaBearishCrosses: withStrategies.filter(hist => hist.sma && hist.sma.bearishCross).map(hist => hist.dateFormatted),
  })


  const withAnalysis = withStrategies.map((hist, index, arr) => ({
    ...hist,
    ...(() => {
      const { currentPrice } = hist;
      const nextIndex = index + 1;
      const stopLoss = trailingStopLoss(currentPrice, 1.75);
      const holdFor = arr.slice(nextIndex).findIndex((compareHist, compareIndex) => {
        return stopLoss(compareHist);
        // return sellWhen(compareHist, hist, compareIndex);
      });
      const restOfDay = arr.slice(nextIndex, nextIndex + holdFor + 1);
      if (!restOfDay.length) return {};
      const followingCloses = restOfDay.map(hist => hist.close);
      const trendTo = val => getTrend(val, currentPrice);
      const analysis = {
        trendToMax: trendTo(
          Math.max(...followingCloses)
        ),
        trendToCloses: trendTo(
          avgArray(followingCloses)
        ),
        trendToFinal: trendTo(
          followingCloses[followingCloses.length - 1]
        ),
        trendToLow: trendTo(
          Math.min(...followingCloses)
        )
      };
      // strlog({
      //   hist,
      //   restOfDay,
      //   analysis
      // })
      return {
        analysis,
        soldAt: restOfDay[restOfDay.length - 1].dateFormatted,
        heldForNumPeriods: restOfDay.length
      };
    })()
  }));

  strlog({ withAnalysis })

  
  const analyzeHits = withHits => {
    const allAnalysis = withHits
      .filter(hist => hist.hit)
      .map(hist => hist.analysis)
      .filter(Boolean);
    // strlog({ allAnalysis })

    const heldForNumPeriods = withHits.filter(hist => hist.hit).map(hit => hit.heldForNumPeriods);
    strlog({ heldForNumPeriods });
    
    return allAnalysis.length ? Object.keys(allAnalysis[0])
      .reduce((acc, key) => {
        // console.log({ key })
        const allVals = allAnalysis
          .map(analysis => analysis[key])
          .filter(Boolean);
        return {
          ...acc,
          [key]: {
            avgArray: +avgArray(allVals).toFixed(2),
            percUp: Math.round(percUp(allVals)),
          },
        };
      }, {
        avgHeldForNumPeriods: Math.round(avgArray(
          heldForNumPeriods.filter(Boolean)
        )),
        count: allAnalysis.length
      }) : null;
  };

  const leavingRSIAlert2Away = withAnalysis.map((hist, index, arr) => {
    const threeAway = arr[index - 3];
    const prevHists = arr.slice(index - 2, index);

    // console.log({
    //   threeAway,
    //   prevHists
    // })
    return {
      ...hist,
      hit: [
        hist.rsi > 30,
        threeAway && threeAway.rsi < 30,
        prevHists.length === 2,
        prevHists.every(prevHist => prevHist.rsi > 30)
      ].every(val => {
        // console.log(val);
        return !!val;
      })
    };

  });

  // strlog({ leavingRSIAlert2Away });



  const nextKSTalert = (() => {
    const copy = [...withAnalysis];
    let activeRSI = false;
    copy.forEach(hist => {
      if (hist.rsi < 30) {
        activeRSI = true;
      } else {
       
        if (activeRSI && hist.rsi > 30 && hist.kst) {
          hist.hit = true;
          activeRSI = false;
        }
      }
    });
    return copy;
  })();


  const createHitWhen = condition => withAnalysis.map(hist => ({
    ...hist,
    hit: condition(hist)
  }));

  const anyKst = hist => hist.kst && !!Object.keys(hist.kst).find(key => !!hist.kst[key]);
  const anySmoothKst = hist => hist.smoothKst && !!Object.keys(hist.smoothKst).find(key => !!hist.smoothKst[key]);

  const results = mapObject({




    // RSI


    everyRSIUnder30: createHitWhen(
      hist => hist.rsi < 30
    ),

    everyRSIUnder20: createHitWhen(
      hist => hist.rsi < 20
    ),

    everyRSIUnder10: createHitWhen(
      hist => hist.rsi < 10
    ),

    leavingRSIAlert: withAnalysis.map((hist, index, arr) => {

      const prevHist = arr[index - 1];
      return {
        ...hist,
        ...prevHist && prevHist.rsi < 30 && hist.rsi > 30 && {
          hit: true
        }
      };

    }),

    leavingRSIAlert2Away,


    



    nextKSTalert,

    // KST

    allKst: createHitWhen(anyKst),


    kstSignalCrosses: createHitWhen(
      hist => get(hist.kst, 'isSignalCross')
    ),

    kstZeroCrosses: createHitWhen(
      hist => get(hist.kst, 'isZeroCross')
    ),

    allLows: createHitWhen(
      hist => get(hist.kst, 'isLow')
    ),

    // KST

    allSmoothKst: createHitWhen(anySmoothKst),


    kstSmoothSignalCrosses: createHitWhen(
      hist => get(hist.smoothKstResponse, 'isSignalCross')
    ),

    kstSmoothZeroCrosses: createHitWhen(
      hist => get(hist.smoothKstResponse, 'isZeroCross')
    ),

    allSmoothLows: createHitWhen(
      hist => get(hist.smoothKstResponse, 'isLow')
    ),

    // BOTH

    both: createHitWhen(
      hist => anyKst(hist) && hist.rsi < 30
    ),

    // SMA

    smaBullishCrosses: createHitWhen(
      hist => get(hist.sma, 'bullishCross')
    ),


    // EMA crossovers

    emaCrossover: createHitWhen(
      hist => get(hist.ema, 'bullishCross')
    ),


    // RANDOM hotdogs!

    randomTenth: createHitWhen(
      hist => Math.random() < 0.1
    ),

    randomHundredth: createHitWhen(
      hist => Math.random() < 0.01
    )
    


  }, withHits => ({
    dates: withHits
      .filter(hist => hist.hit)
      .reduce((acc, hist) => ({
        ...acc,
        [hist.dateFormatted]: hist
      }), {}),
    analysis: analyzeHits(withHits)
  }));

  strlog({ results });


  console.table(
    Object.keys(results)
      .map(key => ({
        strategy: key,
        ...results[key]
      }))
      .filter(obj => obj.analysis)
      .map(obj => ({
        ...pick(obj, ['strategy']),
        ...obj.analysis.trendToFinal,
        ...pick(obj.analysis, ['avgHeldForNumPeriods', 'count'])
      }))
      .sort((a, b) => b.avgArray - a.avgArray)
  );

  // strlog(
  //   withAnalysis
  //     .filter(a => a.analysis)
  //     .sort((a, b) => get(b.analysis, 'trendToCloses') - get(a.analysis, 'trendToCloses'))
  //     .slice(0, 10), 
  // )
};