const manualPms = require('../pms/manual');
const flatten = require('../utils/flatten-array');

const getFilesSortedByDate = require('../utils/get-files-sorted-by-date');
const jsonMgr = require('../utils/json-mgr');
const stratPerfMultiple = require('./strategy-perf-multiple');
const { generateBreakdownConfigs, runBreakdown } = require('./strategy-perf-multiple/generate-breakdowns');

module.exports = async (daysBack, ...pmNames) => {
    let pmStrats = flatten(
        pmNames.map(pm => manualPms[pm])
    );
    pmStrats = [...new Set(pmStrats)];
    const stratPerf = await stratPerfMultiple(daysBack, ...pmStrats);
    // console.log(stratPerf);

    const allStratsPerf = pmStrats
        .map(strat => {
            return stratPerf.find(perf => perf.strategy === strat);
        })
        .filter(obj => !!obj);

    const breakdownConfigs = generateBreakdownConfigs(allStratsPerf);
    const { topTwoThirdsLowestMaxAvgTrendCount } = breakdownConfigs;
    console.log(topTwoThirdsLowestMaxAvgTrendCount);
    const modifiedBreakdown = {
        ...topTwoThirdsLowestMaxAvgTrendCount,
        filterFn: () => true,   // dont limit to top 2/3rd counts,
        includeAll: true
    };
    const brokenDown = runBreakdown(allStratsPerf, modifiedBreakdown);
    console.log('broken')
    console.log(JSON.stringify(brokenDown, null, 2))
    const cleanedUp = brokenDown
        .map(obj => {
            ['allDays', 'breakdowns', 'bigDays', 'daysDown'].forEach(key => {
                delete obj[key];
            });
            return obj;
        });

    const limits = {
        upperCounts: ({ count }) => count > daysBack * 2 / 3,
        middleCounts: ({ count }) => count >= daysBack * 1 / 3 && count <= daysBack * 2 / 3,
        lowCounts: ({ count }) => count < daysBack * 1 / 3 && count >= 2,
        realLowCounts: ({ count }) => count < 2
    };

    const missing = pmStrats
        .filter(strat =>
            !cleanedUp
                .map(o => o.strategy)
                .includes(strat)
        )
        .map(strategy => ({ strategy }));

    const objRoundup = Object.keys(limits).reduce((acc, key) => ({
        [key]: cleanedUp.filter(limits[key]),
        ...acc
    }), { missing });


    console.log('total: ', missing.length + cleanedUp.length);

    Object.keys(objRoundup).forEach(key => {
        console.log(key);
        console.log('----------');
        objRoundup[key].forEach(({ strategy, count, maxs }) => {
            console.log(
                [
                    strategy,
                    count,
                    maxs && JSON.stringify(
                        maxs.map(i => Math.round(i))
                    )
                ].join(' ')
            );
        });
    });

    console.log('----------');

    return objRoundup;
};
