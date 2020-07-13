const { sumArray, avgArray, percUp } = require('../utils/array-math');
Array.prototype.flatten = function() {
    return [].concat(...this);
};
const analyzeGroup = analyzedPositions => {
    // console.log({ analyzedPositions })
    let forConsideration = analyzedPositions.filter(position => (position.buys || []).length);
    forConsideration = analyzedPositions.filter(position => !isNaN(position.netImpact) && position.numPicks);
    // console.log({ forConsideration})
    const totalBought = sumArray(forConsideration.map(pos => pos.totalBuyAmt));
    const totalImpact = sumArray(forConsideration.map(pos => pos.netImpact));
    const weightAvg = selector => avgArray(
        forConsideration.map(pos => 
            (new Array(Math.round(Math.max(Number(selector(pos)) || 1, 1)))).fill(pos.impactPerc)
        ).flatten()
    );
    return {
    // dollars
        totalBought,
        totalImpact,
        // percentages
        percChange: +(totalImpact / totalBought * 100).toFixed(2),
        avgPositionImpactPerc: avgArray(forConsideration.map(pos => pos.impactPerc)),
        avgPickImpactPerc: weightAvg(({ numPicks }) => numPicks),
        avgMultiplierImpactPerc: weightAvg(({ numPicks, numMultipliers }) => numMultipliers || numPicks),
        percUp: percUp(
            forConsideration.map(pos => pos.netImpact)
        ),
        // counts
        totalPositions: forConsideration.length,
        totalPicks: sumArray(forConsideration.map(pos => pos.numPicks)),
        totalMultipliers: sumArray(forConsideration.map(pos => pos.numMultipliers)),
    };
};

module.exports = analyzeGroup;