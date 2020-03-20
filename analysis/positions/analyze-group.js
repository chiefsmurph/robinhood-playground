const { sumArray, avgArray, percUp } = require('../../utils/array-math');

const analyzeGroup = analyzedPositions => {
  console.log({ analyzedPositions })
  const forConsideration = analyzedPositions.filter(position => (position.buys || []).length);
  const totalBought = sumArray(forConsideration.map(pos => pos.totalBuyAmt));
  const totalImpact = sumArray(forConsideration.map(pos => pos.netImpact));
  strlog({
    forConsideration
  })
  return {
    // dollars
    totalBought,
    totalImpact,
    // percentages
    percChange: +(totalImpact / totalBought * 100).toFixed(2),
    avgPositionImpactPerc: avgArray(forConsideration.map(pos => pos.impactPerc)),
    avgPickImpactPerc: avgArray(
      forConsideration.map(pos => 
        (new Array(pos.numPicks)).fill(pos.impactPerc)
      ).flatten()
    ),
    avgMultiplierImpactPerc: avgArray(
      forConsideration.map(pos => 
        (new Array(Math.round(pos.numMultipliers))).fill(pos.impactPerc)
      ).flatten()
    ),
    // percUp: percUp(
    //   analyzedPositions.map(pos => pos.netImpact)
    // ),
    // counts
    totalPositions: forConsideration.length,
    totalPicks: sumArray(forConsideration.map(pos => pos.numPicks)),
    totalMultipliers: sumArray(forConsideration.map(pos => pos.numMultipliers)),
  }
};

module.exports = analyzeGroup;