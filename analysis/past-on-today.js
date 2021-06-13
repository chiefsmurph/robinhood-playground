// look at strategy perf overall
// how would the top strategies perform if bought today?

const stratPerfOverall = require('./strategy-perf-overall');
const stratPerfToday = require('./strategy-perf-today');
const { avgArray } = require('../utils/array-math');
// const strategiesEnabled = require('../strategies-enabled');

module.exports = async () => {
    const overall = await stratPerfOverall(false, 6, 4);
    const today = await stratPerfToday();
    console.log(overall, today);

    let results = {};

    const returnDidToday = (strategyName) => {
        return {
            strategyName,
            didToday: (() => {
                const foundInToday = today.find(stratPerf => stratPerf.strategyName === strategyName);
                return foundInToday ? foundInToday.avgTrend : null;
            })()
        };
    };

    // const addStrategiesToResults = (breakdown, strategies) => {
    //     console.log(strategies, 'strats');
    //     const withDidToday = strategies.map(returnDidToday);
    //     console.log('with did', withDidToday);
    //     const didTodayArray = withDidToday.map(strat => strat.didToday);
    //     results[breakdown] = {
    //         avgTrend: avgArray(didTodayArray.filter(val => !!val)),
    //         didTodayArray
    //     };
    // };

    Object.keys(overall).forEach(breakdown => {
        const top10 = overall[breakdown]
            .filter(stratPerf => !stratPerf.name.includes('cheapest-picks'))
            .slice(0, 10)
            .map(stratPerf => stratPerf.name);
        addStrategiesToResults(breakdown, top10);
    });

    // addStrategiesToResults('strategies-enabled purchase', strategiesEnabled.purchase);
    // addStrategiesToResults('strategies-enabled for email', strategiesEnabled.email['chiefsmurph@gmail.com']);
    return results;
};
