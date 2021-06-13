const stratPerfOverall = require('../analysis/strategy-perf-overall');
const strategyPerfToday = require('../analysis/strategy-perf-today');

const { uniqifyArrayOfStrategies } = require('../utils/uniqify-stuff');
const getNames = arr => arr.map(pick => pick.name);

module.exports = async () => {
    const { sortedByPercUp } = await stratPerfOverall(true, 60);
    console.log(sortedByPercUp, 'haha');

    const countPerms = [1, 2, 3, 4, 5, 6];

    return countPerms.reduce((acc, val) => ({
        ...acc,
        [`tiptop-minCount${val}`]: getNames(
            uniqifyArrayOfStrategies(
                sortedByPercUp.filter(strat => strat.percUp === 1 && strat.count >= val)
            )
        )
    }), {});
};
