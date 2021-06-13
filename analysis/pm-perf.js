const manualPms = require('../pms/manual');
const flatten = require('../utils/flatten-array');

const getFilesSortedByDate = require('../utils/get-files-sorted-by-date');
const jsonMgr = require('../utils/json-mgr');
const stratPerfMultiple = require('./strategy-perf-multiple');

module.exports = async (daysBack, ...pmNames) => {
    const pmStrats = flatten(
        pmNames.map(pm => manualPms[pm])
    );
    const stratPerf = await stratPerfMultiple(daysBack, ...pmStrats);
    // console.log(stratPerf);

    const allStratsPerf = pmStrats
        .map(strat => {
            return stratPerf.find(perf => perf.strategy === strat);
        })
        .filter(obj => !!obj)
        .map(obj => {
            ['allDays', 'breakdowns', 'bigDays', 'playouts'].forEach(key => {
                delete obj[key];
            });
            return obj;
        });
    return allStratsPerf;
};
