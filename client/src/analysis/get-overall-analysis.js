import getSubsets from './get-subsets';
import { groupBy, mapObject } from 'underscore';
import analyzeGroup from './analyze-group';
Array.prototype.uniq = function() {
  return [...new Set(this)];
};

export default (positions, subsets) => {
  subsets = subsets || getSubsets(positions);
  const overall = mapObject(subsets, (subsetFn = () => true, subsetName) => {
    const matchingPositions = positions.filter(pos => {
      try {
        return subsetFn(pos);
      } catch (e) {
        return false;
      }
    });
    return analyzeGroup(
      matchingPositions
    );
  }
    
  );

  return overall;
};