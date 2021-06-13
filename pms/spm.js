const getFilesSortedByDate = require('../utils/get-files-sorted-by-date');
const { uniqifyArrayOfStrategies } = require('../utils/uniqify-stuff');
const strategyPerfMultiple = require('../analysis/strategy-perf-multiple');

module.exports = async (daysBack) => {

    let spm;

    console.log('SPM SPM SPM', {daysBack});

    if (!daysBack) {
        console.log('from strat-perf-multiples')
        const files = await getFilesSortedByDate('strat-perf-multiples');
        console.log(files);
        if (!files.length) {
            return {};
        }
        spm = require(`../json/strat-perf-multiples/${files[0]}`);
        console.log(Object.keys(spm));
    } else {
        console.log({ daysBack });
        spm = await strategyPerfMultiple(daysBack);

    }

    return Object.keys(spm).reduce((acc, key) => {
        const results = spm[key].filter(({ strategy }) => !strategy.includes('ticker-watchers'));
        return {
            ...acc,
            [key]: results.map(list => list.strategy),
            [`${key}-slice7`]: results.slice(0, 7).map(list => list.strategy),
            [`${key}-slice7-uniq`]: uniqifyArrayOfStrategies(results.slice(0, 7)).map(list => list.strategy),
            [`${key}-single`]: results.slice(0, 1).map(list => list.strategy),
        };
    }, {});
}