const strategyPerfOverall = require('../analysis/strategy-perf-overall');
const { uniqifyArrayOfStrategies } = require('../utils/uniqify-stuff');

module.exports = async Robinhood => {
    const tenFive = await strategyPerfOverall(true, 10, 5);
    str({ tenFive })
    const modified = Object.keys(tenFive).reduce((acc, key) => {

        const stratPerf = tenFive[key];
        const uniqd = uniqifyArrayOfStrategies(stratPerf, 0.7);

        const getNames = strats => strats
            .map(o => o.name)
            .filter(s => !s.includes('cheapest-picks'))
            .filter(s => !s.includes('ticker-watchers'));
        str({
            stratPerf: getNames(stratPerf),
            uniqd: getNames(uniqd)
        });

        const slice = (perf, count) => getNames(perf).slice(0, count);


        const perms = {
            single: 1,
            two: 2,
            three: 3,
            five: 4,
            seven: 7,
            eleven: 11
        };
        // const processPerm = 
        return Object.keys(perms).reduce((acc, permKey) => ({
            ...acc,
            [`${key}-${permKey}`]: slice(stratPerf, perms[permKey]),
            [`${key}-uniqd-${permKey}`]: slice(uniqd, perms[permKey]),
        }), acc);
        
    }, {});
    return modified;
};