const { mapObject } = require('underscore');
const { avgArray, sumArray } = require('../utils/array-math');
const getSubsetOffset = require('../analysis/positions/get-subset-offset');

const { alpaca: alpacaModule }= require('../alpaca/index');
const { avgDownerMultiplier } = require('../settings');

const calcPmAnalysisMultiplier = (pms, pmsAnalyzed) => {

  const pmAnalysis = pms
      .map(pm => 
          pmsAnalyzed.find(({ pm: comparePm }) => comparePm === pm)
      )
      .filter(Boolean)
      .filter(({ jsonAnalysis: { daysCount } = {} }) => daysCount >= 3);
  
  if (pmAnalysis.length < 2) return 0;

  const avgChecks = {
    overallAvg: values => avgArray(values) > 2,
    percUp: values => avgArray(values) > 87,
    min: values => Math.min(...values.filter(Boolean)) > 1,
  };

  const trueFalseAvgChecks = mapObject(avgChecks, (checkFn, prop) => {
    return checkFn(pmAnalysis.map(pmPerf => pmPerf[prop]));
  });

  const avgCheckCount = Object.values(trueFalseAvgChecks).filter(Boolean).length;
  strlog({ pmAnalysis, avgChecks, trueFalseAvgChecks, avgCheckCount })

  return avgCheckCount;
};

module.exports = async (pms, strategy, stocksToBuy) => {
  console.log({
    pms,
    strategy,
    stocksToBuy
  })
  console.log('get additional multipliers')
  const stratManager = require('../socket-server/strat-manager');
  await stratManager.init({ lowKey: true });
  const { pmsAnalyzed, positions: { alpaca } = {} } = stratManager;
  
  if (alpaca === undefined) return {};
  
  const pmAnalysisMultiplier = calcPmAnalysisMultiplier(pms, pmsAnalyzed);


  const existingPositions = stocksToBuy.map(ticker => 
    alpaca.find(pos => pos.ticker === ticker)
  ).filter(Boolean);


  const avgMultipliersPerPick = Math.round(
    avgArray(
      existingPositions
        .map(position => position.avgMultipliersPerPick)
        .flatten()
    )
  );

  const totalEquity = sumArray(
    existingPositions
        .map(position => Number(position.equity))
        .flatten()
  );

  const existingInterestingWords = existingPositions
    .map(position => position.interestingWords)
    .flatten();
  
  const newInterestingWords = [
    ...pms,
    strategy
  ].map(str => str.split('-')).flatten();
  const interestingWords = [
    ...existingInterestingWords,
    ...newInterestingWords
  ].uniq();
  console.log({ existingInterestingWords, newInterestingWords, interestingWords });

  const fakePosition = { 
    ticker: stocksToBuy,
    interestingWords,
    numPicks: sumArray(
      existingPositions.map(position => position.numPicks)
    ) + 1,
    numMultipliers: sumArray(
      existingPositions.map(position => position.numMultipliers)
    ) + 1
  };


  const zeroMultMult = totalEquity / 3.5;
  const getAvgDownMultiplier = () => 
    Math.round(
      avgMultipliersPerPick
        ? avgMultipliersPerPick * avgDownerMultiplier
        : isNaN(zeroMultMult) ? 20 : zeroMultMult
    );
  const isOvernightHold = strategy.includes('overnight') && strategy.includes('holds');
  let subsetOffsetMultiplier = strategy.includes('avg-downer') || isOvernightHold
    ? getAvgDownMultiplier()
    : await getSubsetOffset(fakePosition);

  
  // if (strategy.includes('majorJump')) {
  //   // check for 3 daytrades
  //   const account = await alpacaModule.getAccount();
  //   const { daytrade_count } = account;
  //   if (daytrade_count === 3) {
  //     subsetOffsetMultiplier = Math.round(subsetOffsetMultiplier / 1.1);
  //     interestingWords.push('dtmajcapped');
  //   }
  // }


  const [_, stMultiplier = 1] = Object.entries({
    bullish: 1.2,
    bearish: 0.7,
  }).find(([word]) => s.includes(word)) || [];

  return {
    pmAnalysisMultiplier: pmAnalysisMultiplier * stMultiplier,
    subsetOffsetMultiplier: subsetOffsetMultiplier * stMultiplier,
    interestingWords
  };
};