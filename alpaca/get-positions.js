const { alpaca } = require('.');
const getStSentiment = require('../utils/get-stocktwits-sentiment');
const { avgArray, zScore } = require('../utils/array-math');
const getTrend = require('../utils/get-trend');
const getSpyTrend = require('../utils/get-spy-trend');
const Holds = require('../models/Holds');
const Pick = require('../models/Pick');
const Log = require('../models/Log');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const analyzePosition = require('../analysis/positions/analyze-position');
const { sellBelow = {}, sellAbove = {}, force: { keep }, continueDownForDays } = require('../settings');
const getBalance = require('./get-balance');
const runScan = require('../scans/base/run-scan');

const cacheThis = require('../utils/cache-this');

const addSingleZScores = require('./add-single-zscores');
const shouldSellOff = require('./should-sell-off');
const { pick } = require('underscore');

const cachedScan = cacheThis(async tickers => {
  const scan = await runScan({
    tickers,
    includeGoogleNews: true,
    minPrice: Number.NEGATIVE_INFINITY,
    maxPrice: Number.POSITIVE_INFINITY
  });
  return scan.reduce((acc, { ticker, ...result }) => ({
    ...acc,
    [ticker]: result
  }), {});
}); // 20 minutes




const checkForHugeDrop = position => {
  let { currentPrice, returnPerc: actualReturnPerc, avgEntry: actualEntry, buys = [], ticker } = position;
  const dropIndex = buys.slice().reverse().findIndex((buy, index, arr) => {
    const isBigDrop = arr[index + 1] && buy.fillPrice < arr[index + 1].fillPrice * .7;
    const isNotToday = buy.date !== (new Date()).toLocaleDateString().split('/').join('-');
		return isBigDrop && isNotToday;
  });
  if (dropIndex !== -1) {
    // if (ticker === 'FCEL') {
    //   strlog({
    //     ticker,
    //     dropIndex,
    //   })
    // }
    const avgEntry = avgArray(
      buys.slice(dropIndex).map(buy => buy.fillPrice)
    );
    return {
      dropIndex,
      avgEntry,
      returnPerc: getTrend(currentPrice, avgEntry),
      actualEntry,
      actualReturnPerc,
    };
  }
};

const activeRS = {
  // FTSI: 20
  // CTRM: 10
};
const handleRS = ({ ticker, avgEntry, quantity, unrealizedPl, currentPrice }) => {
  const found = activeRS[ticker];
  if (found) {
    const newProps = {
      avgEntry: avgEntry * found,
      quantity: quantity / found
    };
    const actualPl = (currentPrice - newProps.avgEntry) * newProps.quantity;
    const rsOffset = unrealizedPl -  actualPl;
    return {
      ...newProps,
      actualPl,
      rsOffset
    };
  }
};








module.exports = async (
  skipStSent = false
) => {

  const spyTrend = await getSpyTrend();
  const balance = await getBalance();

  const min = getMinutesFromOpen();

  const uniqDates = [
    (new Date()).toLocaleDateString().split('/').join('-'),
    ...(await Pick.getUniqueDates()).reverse()
  ].uniq();

  console.log({
    uniqDates
  })
  const getDaysOld = date => {
    return uniqDates.indexOf(date);
  };
  // strlog({ uniqDates })
  
  let positions = await alpaca.getPositions();

  const scan = await cachedScan(
    positions.map(p => p.symbol)
  );


  // await new Promise(resolve => setTimeout(resolve, 5000));


  // strlog({ positions })
  positions = positions.map(({ 
    symbol, 
    avg_entry_price, 
    qty, 
    unrealized_pl, 
    unrealized_plpc, 
    current_price,
    ...rest 
  }) => ({
    ticker: symbol,
    avgEntry: avg_entry_price,
    quantity: qty,
    returnPerc: unrealized_plpc * 100,
    unrealizedPl: Number(unrealized_pl),
    currentPrice: Number(current_price),
    ...rest
  }));


  const { dontSell = [], maxPercentOfBalance = 40, favs = [] } = await getPreferences();

  positions = await mapLimit(positions, 3, async position => {
    const { ticker } = position;
    const hold = await Holds.findOne({ ticker }).lean() || {};
    
    const { buys = [] } = hold;
    if (!buys.length) {
      console.log('hey! no buys?', ticker);
    }

    const buyStrategies = buys.map(buy => buy.strategy).reduce((acc, strategy) => ({
      ...acc,
      [strategy]: (acc[strategy] || 0) + 1
    }), {});


    const [daysOld, mostRecentPurchase] = buys.length >= 1 ? [
      buys[0],
      buys[buys.length - 1]
    ].map(buy => getDaysOld(buy.date)) : [0, 0];

    // const numDaysNeeded = Math.max(continueDownForDays, (continueDownForDays * 0.5) + (daysOld - mostRecentPurchase));
    // const sellOffDaysLeft = Math.floor(numDaysNeeded - mostRecentPurchase);

    // strlog({ buys});

    let wouldBeDayTrade = dontSell.includes(ticker) || Boolean(mostRecentPurchase === 0);
    if (!wouldBeDayTrade) {
      const foundInLogs = await Log.boughtToday(ticker);
      if (!!foundInLogs) {
        wouldBeDayTrade = true;
        await log(`ERROR: (not really) we thought ${ticker} was not a daytrade but found evidence of a daytrade in the logs.`, {
          mostRecentPurchase,
          daysOld,
          buys,
          uniqDates
        });
      }
    }
    return {
      ...position,
      ...hold,
      buyStrategies,
      daysOld,
      mostRecentPurchase,
      // sellOffDaysLeft,
      wouldBeDayTrade,
      ...!skipStSent && {
        stSent: await getStSentiment(ticker) || {}
      }
    };
  });

  positions = positions.map(position => ({
    ...position,
    ...checkForHugeDrop(position)
  }));

  positions = positions.map(position => ({
    ...position,
    ...handleRS(position)
  }));

  positions = positions.map(position => {
    const { 
      stSent: { upperLimit, lowerLimit } = {},
      returnPerc
    } = position;
    return {
      ...position,
      outsideBracket: Boolean(returnPerc >= upperLimit || returnPerc <= lowerLimit)
    };
  });

  const ratioDayPast = 0.2 || Math.max(0.2, Math.min(min / 360, 1));
  // strlog({ ratioDayPast })


  const withAnalysis = await mapLimit(positions, 2, async position => 
    position.buys ? {
      ...position,
      ...await analyzePosition(position)
    } : position
  );

  const calcNotSelling = ({ ticker, currentPrice }) => {
    const options = { 
      [`is above sellBelow`]: currentPrice > sellBelow[ticker],  // nothing greater than undefined,
      [`is below sellAbove`]: currentPrice < sellAbove[ticker],   // false if undefined
      onKeeperList: keep.includes(ticker)
    };
    return (
      Object.entries(options)
        .filter(([_, isTrue]) => isTrue)
        .shift() 
      || [false]
    ) [0];
  };


  const getPercToSell = position => {

    let {
      symbol,
      daysOld,
      mostRecentPurchase,
      // sellOffDaysLeft,
      returnPerc, 
      outsideBracket, 
      numMultipliers,
      wouldBeDayTrade, 
      ticker, 
      market_value, 
      unrealized_intraday_plpc,
      notSelling,
      stSent: { stBracket, bullBearScore } = {},
      sells = []
    } = position;

    if (notSelling || wouldBeDayTrade) return 0;

    // if (returnPerc > 200) {
    //   return 0;
    // }

    // if (market_value <= mostRecentPurchase * 10 && daysOld >= 2) {
    //   return 100;
    // }

    
    const sellOffToday = shouldSellOff(position);
    // if (sellOffToday) {
    //   log(`SELLOFF REC - ${ticker}`, {
    //     daysOld,
    //     mostRecentPurchase,
    //     bullBearScore,
    //     numMultipliers
    //   })
    // }


    const isInitialSell = (min >= -15 && min <= 25);
    // const initialSellPerc = (() => {
    //   if (bullBearScore > 100) return 0;
    //   if (returnPerc < -15 || returnPerc > 20) return 60;
    //   return 80;
    // })();

    // if (isInitialSell && spyTrend < 0) {
    //   return 0;
    // }

    if (sellOffToday && !isInitialSell) {
      return 100;
    }



    if (min < 0 && min > -200) {  // premarket only sell winners
      return returnPerc > 5 && unrealized_intraday_plpc > 5 && market_value > 60 && !sellOffToday ? 6 : 0;
    }



    if (mostRecentPurchase < continueDownForDays / 2 && returnPerc < 20) return 0;

    // if (Number(market_value) < balance / 420 && daysOld >= 10 && bullBearScore < 180) return 100;
    


    // if (returnPerc < 5 && min > 0) {
    //   return 100;
    // }



    // if (min > 150 && Number(unrealized_intraday_plpc) * 100 < -6 && Number(unrealized_intraday_plpc) * 100 > -30) {
    //   return 35;
    // }
    
    // synonymous with prev
    // if (min < 50 && returnPerc < -4) {
    //   return 0;
    // }


    // if (wouldBeDayTrade) return null;
    // if (min < 20 && returnPerc > 12) return 40;
    // if (Math.abs(returnPerc) > 30) return 24;


    // if (daysOld <= continueDownForDays * 2 && returnPerc < 3 + daysOld * 2) {
    //   return 0;
    // }


    const dayVal = mostRecentPurchase * 4 + daysOld * 2;
    let returnVal = Math.abs(returnPerc) / 2;
    // if (returnPerc < 0) {
    //   returnVal *= 2;
    // }
    const basePercent = dayVal + returnVal;

    // shouldVal is based on intraday pl
    const intraDayPl = Number(unrealized_intraday_plpc);
    // const weightedIntraday = intraDayPl < 0 
    //   ? intraDayPl
    //   : intraDayPl * 2;

    let shouldVal = Math.abs(intraDayPl) * 100;
    // if (outsideBracket) {
    //   shouldVal += returnPerc ? 4 : 28;
    // }
    // subtract perc if looking good?
    const stBracketNumbers = {
      bullish: 0.65,
      neutral: 0.8
    };
    const stOffset = stBracketNumbers[stBracket] || 1;
    // slow down if perc to sell is bullish
    const summed = (basePercent + shouldVal) * stOffset;

    const halfSum = summed * .5;
    const weightedByDayInProgress = halfSum + ratioDayPast * halfSum;

    const RAND_VARY_PERC = 3;
    let randomized = weightedByDayInProgress + (Math.random() * RAND_VARY_PERC) - (RAND_VARY_PERC / 2);


    if (Math.abs(returnPerc) < 4.5) {
      randomized = randomized / 3;
    }

    // strlog({
    //   ticker,
    //   wouldBeDayTrade,
    //   basePercent,
    //   shouldVal,
    //   summed,
    //   halfSum,
    //   weightedByDayInProgress,
    //   randomized,
    // });

    return +randomized.toFixed(2);
  };

  const getRecommendation = position => {
    const { returnPerc, outsideBracket, wouldBeDayTrade } = position;
    if (!outsideBracket) {
      return '---';
    }
    const action = (returnPerc > 0) ? 'take profit' : 'cut your losses';
    return wouldBeDayTrade ? `possibly ${action}` : action;
  };

  const withNotSelling = withAnalysis.map(position => ({
    ...position,
    notSelling: calcNotSelling(position)
  }));

  const withRecommendations = withNotSelling.map(position => ({
    ...position,
    recommendation: getRecommendation(position),
    percToSell: getPercToSell(position)
  }));

  const withScan = withRecommendations
    .map(position => ({
      ...position,
      scan: scan[position.ticker]
    }))
    .map(position => ({
      ...position,
      ...pick(position.scan || {}, ['zScoreSum'])
    }));


  const withPercentOfBalance = withScan
    .map(position => ({
      ...position,
      percentOfBalance: position.market_value / balance * 100
    }))
    .map(position => ({
      ...position,
      aboveMaxBuy: position.percentOfBalance > maxPercentOfBalance
    }))
    .map((position, _, array) => ({
      ...position,
      marketValueZScore: zScore(
        array.map(p => p.market_value),
        position.market_value
      )
    }));

  const handledFavs = withPercentOfBalance.map(position => {
    if (favs.includes(position.ticker)) {
      position.isFav = true;
    }
    return position;
  });
  const withSingleZScores = addSingleZScores(handledFavs);
  const sorted = withSingleZScores.sort((a, b) => b.market_value - a.market_value);
  const withCurrentActions = sorted.map(position => {
    const { buys = [], sells = [], isSelling } = position;
    const getMinuteDiff = ({ timestamp }) => 
      (Date.now() - (new Date(timestamp).getTime())) / 1000 / 60;
    const transactionWithinMinutes = (minLimit = 45) =>
      transaction => getMinuteDiff(transaction) < minLimit;
    const isBuying = buys.some(transactionWithinMinutes());
    const actuallySelling = sells.some(transactionWithinMinutes()) || isSelling;
    return {
      ...position,
      currentAction: isBuying
        ? 'buying'
        : actuallySelling
          ? 'selling'
          : null
    };
  });
  const withHugedown = withCurrentActions.map(position => {
    const hugeDown = Boolean(
      position.buyMult > 5 ||
      position.zScoreSum > 80 ||
      (position.zScoreSum > 40 && position.zScoreFinal > 3)
    );
    return {
      ...position,
      hugeDown,
      buyMult: Math.max(2, buyMult + 1)
    };
  });
  return withHugedown;

};