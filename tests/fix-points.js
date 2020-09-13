const getPositions = require('../alpaca/get-positions');
const Hold = require('../models/Holds');

module.exports = async () => {
  const positions = await getPositions(true);
  for (const position of positions) {
    const { ticker, numMultipliers, mostDownPoints } = position;
    const hold = await Hold.findOne({ ticker });
    console.log({ ticker, mostDownPoints, numMultipliers })
    if (mostDownPoints) hold.mostDownPoints = mostDownPoints * 0.4;
    hold.pickPoints = numMultipliers * 0.4;
    await hold.save();
    strlog({ hold: hold.toObject()})
  }
  strlog({ positions})
};