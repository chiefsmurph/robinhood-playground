const manualPms = require('../pms/manual');
const flatten = require('../utils/flatten-array');

const getFilesSortedByDate = require('../utils/get-files-sorted-by-date');
const jsonMgr = require('../utils/json-mgr');
const stratPerfMultiple = require('./strategy-perf-multiple');

module.exports = async (...pmNames) => {
    let pmStrats = flatten(
        pmNames.map(pm => manualPms[pm])
    );
    pmStrats = [...new Set(pmStrats)];  // uniqify
    const stratPerfs = {
        50: await stratPerfMultiple(50, ...pmStrats),
        14: await stratPerfMultiple(14, ...pmStrats),
        7: await stratPerfMultiple(7, ...pmStrats)
    };

    const allStratsPerf = {};

    Object.keys(stratPerfs).forEach(key => {
        const results = stratPerfs[key];
        pmStrats.forEach(strat => {
            const foundPerf = results.find(perf => perf.strategy === strat);
            if (foundPerf) {
                allStratsPerf[strat] = (allStratsPerf[strat] || []).concat({
                    daysBack: key,
                    ...foundPerf,
                });
            }
        });
    });

    const stratsAggregated = {};
    Object.keys(allStratsPerf).forEach(strat => {
        stratsAggregated[strat] = allStratsPerf[strat].map(obj => ({
            daysBack: obj.daysBack,
            count: obj.count,
            limit5: obj.playouts.limit5
        }));

        const score = stratsAggregated[strat].reduce((acc, obj) => {
            return acc + obj.limit5.avgTrend;
        }, 0);

        stratsAggregated[strat] = {
            score,
            data: stratsAggregated[strat]
        };

    });

    console.log(JSON.stringify(stratsAggregated, null, 2));
    console.log('-------------');
    console.log('-------------');

    [3, 2, 1].forEach(inc => {

        console.log(`---- ${inc} INCREMENT ----`);

        const filteredStrats = Object.keys(stratsAggregated)
            .filter(strat => {
                return stratsAggregated[strat].data.length === inc;
            });

        filteredStrats
            .sort((a, b) => stratsAggregated[b].score - stratsAggregated[a].score)
            .forEach(strat => {
                console.log('strat', strat);
                console.log('score', stratsAggregated[strat].score);
            });

    });




    // return stratsAggregated;
};
