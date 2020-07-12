const { pick } = require('underscore');
const { sumArray, zScore } = require('../utils/array-math');

module.exports = positions => positions
  .map(position => {

    const { scan = {} } = position;
    const { zScores: { projectedVolume, projectedVolumeTo2WeekAvg } = {} } = scan;
    const zScoreKeys = Object.keys(scan).filter(key => key.includes('zScore') && key !== 'zScores');
    const ofInterest = {
      projectedVolume,
      projectedVolumeTo2WeekAvg,
      ...pick(scan, zScoreKeys)
    };
    strlog({
      ofInterest
    });

    const zScoreSum = sumArray(Object.values(ofInterest));
    return {
      ...position,
      zScoreSum
    };

  })
  .map((position, index, positions) => ({
    ...position,
    zScoreRelative: zScore(
      positions.map(p => p.zScoreSum),
      position.zScoreSum
    ),
    zScoreReturnPerc: zScore(
      positions.map(p => p.returnPerc * -1),
      position.returnPerc * -1
    )
  }))
  .map(position => ({
    ...position,
    zScoreFinal: position.zScoreRelative + (position.zScoreReturnPerc * 3)
  }));;