const ClosedPosition = require('../../models/Holds/ClosedPositions');
const analyzePosition = require('./analyze-position');

module.exports = async () => {
  let closed = await ClosedPosition.find({ archived: undefined }).lean();
  closed = await mapLimit(closed, 1, async position => ({
    ...position,
    ...await analyzePosition(position),
  }));
  return closed;
};