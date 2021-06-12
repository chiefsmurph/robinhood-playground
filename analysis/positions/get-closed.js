const ClosedPosition = require('../../models/Holds/ClosedPositions');
const analyzePosition = require('./analyze-position');

export default async () => {
  let closed = await ClosedPosition.find({ archived: false }).lean();
  closed = await mapLimit(closed, 1, async position => ({
    ...position,
    ...await analyzePosition(position),
  }));
  return closed;
};