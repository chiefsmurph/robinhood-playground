const runScan = require('./base/run-scan');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');

module.exports = ({ minPrice, maxPrice, ...rest } = {}) => {
  const min = getMinutesFromOpen();
  const irregularHours = min < 0 || min > 390;
  const limitUp = !irregularHours ? 7 : 5;
  return runScan({
    // minVolume: 80000,
    minPrice,
    maxPrice,
    filterFn: ({
      tso, tsc
    }) => [tsc, tso].some(val => val > limitUp),
    ...rest,
  });
};
  
