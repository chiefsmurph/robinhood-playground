const Pick = require('../../models/Pick');
const { uniq } = require('underscore');

const { sumArray, avgArray } = require('../../utils/array-math');
const getTrend = require('../../utils/get-trend');

const analyzePosition = async position => {
  let { ticker, sells = [], buys = [], unrealizedPl, avgEntry } = position;
  console.log(`analyzing ${ticker}...`);
  // strlog({
  //   position
  // })
  const numSharesBought = sumArray(
    buys.map(buy => buy.quantity)
  );
  const numSharesSold = sumArray(
      sells.map(buy => buy.quantity)
  );
  const percentSharesSold = numSharesSold / numSharesBought;
  const individualize = array => {
      const grouped = array.map(({ quantity, fillPrice }) => 
          (new Array(quantity)).fill(fillPrice)
      );
      // flatten
      return grouped.reduce((acc, arr) => [...acc, ...arr], []);
  };
  const allBuys = individualize(buys);
  // const avgEntry = avgArray(allBuys);
  const totalBuyAmt = sumArray(allBuys);

  const allSells = individualize(sells);
  avgEntry = avgEntry || avgArray(allBuys);
  const avgSellPrice = avgArray(allSells);
  const sellReturnPerc = getTrend(avgSellPrice, avgEntry);

  let uniqPickIds = buys.map(buy => (buy.relatedPick || '').toString()).uniq();
  uniqPickIds = uniq(uniqPickIds);
  const numPicks = uniqPickIds.length;

  const relatedPicks = (await mapLimit(uniqPickIds.filter(Boolean), 1, pickId => 
    Pick.findOne({ _id: pickId }).lean()
  )).filter(Boolean);
  const numMultipliers = sumArray(
    relatedPicks.map(pick => pick.multiplier || 1)
  );
  const avgMultipliersPerPick = Math.round(numMultipliers / numPicks);
  const avgPickPrice = avgArray(
    relatedPicks.map(pick => pick.picks[0].price).filter(Boolean)
  );
  // strlog({
  //   ticker,
  //   uniqPickIds,
  //   numMultipliers,
  //   avgPickPrice
  // })
  const sellReturnDollars = (numSharesSold / 100) * sellReturnPerc * avgEntry;
  const date = (relatedPicks[0] || buys[0] || {}).date;
  // strlog({
  //   date,
  //   zeroPick: relatedPicks[0],
  //   zeroBuy: buys[0],
  // })
  const allPmsHit = relatedPicks.map(pick => pick.pmsHit).flatten();
  const allStrategiesHit = relatedPicks.map(pick => pick.strategyName);
  const allInterestingWords = relatedPicks.map(pick => pick.interestingWords).flatten();
  const buyStrategies = buys.map(buy => buy.strategy);
  const interestingWords = ([
    ...allPmsHit,
    ...allStrategiesHit,
    ...allInterestingWords,
    ...buyStrategies,
  ]).filter(Boolean).map(dashDel => dashDel.split('-')).flatten().uniq();
  const numAvgDowners = relatedPicks.filter(pick => pick.interestingWords.includes('downer')).length;

  const netImpact = Number(sellReturnDollars || 0) + Number(unrealizedPl || 0);
  return {
      // ...position,s
      totalBuyAmt,
      avgEntry,
      avgPickPrice,
      avgSellPrice,
      sellReturnPerc,
      sellReturnDollars,
      netImpact,
      impactPerc: +(netImpact / totalBuyAmt * 100).toFixed(2),
      date,
      numPicks,
      numMultipliers,
      avgMultipliersPerPick,
      percentSharesSold,
      interestingWords,
      numAvgDowners
  };
};

module.exports = analyzePosition;