const { pick } = require('underscore');
const { sumArray, zScore } = require('../utils/array-math');

const roundTo = numDec => num => Math.round(num * Math.pow(10, numDec)) / Math.pow(10, numDec);
const oneDec = roundTo(1);
const twoDec = roundTo(2);

module.exports = positions => positions
  .map((position, index, positions) => ({
    ...position,
    zScoreRelative: zScore(
      positions.filter(p => !p.aboveMaxBuy).map(p => p.zScoreSum),
      position.zScoreSum
    ),
    zScoreReturnPerc: zScore(
      positions.filter(p => !p.aboveMaxBuy).map(p => p.returnPerc * -1),
      position.returnPerc * -1
    )
  }))
  .map(position => ({
    ...position,
    zScoreFinal: position.aboveMaxBuy ? 0 : twoDec(position.zScoreRelative + (position.zScoreReturnPerc * 2))
  }))
  .map(position => {
    const yesMin = (
      position.zScoreFinal > 2.3 ||
      position.zScoreSum > 55 ||
      position.zScoreRelative > 1.15
    );
    let actOnMultiplier = sumArray([
      position.zScoreFinal / 1.5,
      (position.zScoreSum - 40) / 16
    ].map(Math.floor));
    if (yesMin) {
      actOnMultiplier = Math.max(1, actOnMultiplier);
    }
    return {
      ...position,
      actOnMultiplier,
    };
  });