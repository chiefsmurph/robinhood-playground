const stratPerfMultiple = require('../strategy-perf-multiple');

module.exports = async () => {
  for (skipDays of [...Array(10).keys()].map(i => ++i)) {
    console.log('repopulating spm...')
    strlog({
      skipDays
    })
    await stratPerfMultiple(25, skipDays);
  }
};