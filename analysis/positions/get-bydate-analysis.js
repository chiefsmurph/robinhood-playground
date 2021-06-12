const { groupBy, mapObject } = require('underscore');
const analyzeGroup = require('./analyze-group');

export default positions => {
  const byDate = groupBy(positions, 'date');
  const byDateAnalysis = Object.keys(byDate).map(date => {
    const datePositions = byDate[date];
    return {
      date,
      ...analyzeGroup(datePositions)
    };
  });
  return byDateAnalysis;
};