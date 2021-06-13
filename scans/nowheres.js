const runScan = require('./base/run-scan');

module.exports = ({ minPrice, maxPrice, ...rest } = {}) => 
  runScan({
    minVolume: 40000,
    minPrice,
    maxPrice,
    filterFn: ({
      tso, tsc, tsh
    }) => [tso, tsc, tsh].every(val => Math.abs(val) < 5),

    ...rest,
  });