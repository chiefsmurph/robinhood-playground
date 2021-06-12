const runScan = require('./base/run-scan');

export default ({ minPrice, maxPrice, ...rest } = {}) => 
  runScan({
    minPrice,
    maxPrice,
    minVolume: 100000,
    filterFn: ({
      tso, tsc
    }) => [tso, tsc].every(val => val < -7),
    ...rest
  });