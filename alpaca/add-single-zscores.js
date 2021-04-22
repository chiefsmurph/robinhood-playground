const { pick } = require('underscore');
const { sumArray, zScore } = require('../utils/array-math');

const roundTo = numDec => num => Math.round(num * Math.pow(10, numDec)) / Math.pow(10, numDec);
const oneDec = roundTo(1);
const twoDec = roundTo(2);

module.exports = positions => positions
  .map(position => {

    const { scan = {} } = position;
    const { zScores: { projectedVolume, projectedVolumeTo2WeekAvg } = {}, fiveMinuteRSI } = scan;
    const zScoreKeys = Object.keys(scan).filter(key => key.includes('zScore') && key !== 'zScores');
    const ofInterest = {
      projectedVolume,
      projectedVolumeTo2WeekAvg,
      ...pick(scan, zScoreKeys)
    };
    strlog({
      ofInterest
    });

    const fiveMinuteOffset = Math.max(0, 40 - fiveMinuteRSI);
    const zScoreSum = sumArray(Object.values(ofInterest)) + fiveMinuteOffset;
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
    zScoreFinal: twoDec(position.zScoreRelative + (position.zScoreReturnPerc * 2))
  }));;