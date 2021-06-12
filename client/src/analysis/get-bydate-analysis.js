import { groupBy, mapObject } from 'underscore';
import analyzeGroup from './analyze-group';

export default positions => {
  const byDate = groupBy(positions.filter(position => position.date), 'date');
  const byDateAnalysis = Object.keys(byDate).map(date => {
    const datePositions = byDate[date];
    return {
      date,
      ...analyzeGroup(datePositions)
    };
  });
  return byDateAnalysis.reverse();
};