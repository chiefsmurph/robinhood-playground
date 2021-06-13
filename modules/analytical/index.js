// app-actions
const getMultipleHistoricals = require('../../app-actions/get-multiple-historicals');


const strategies = {
    onlyUp: require('./only-up'),
    reversingUp: require('./reversing-up')
};

const prefixKeys = (obj, prefix) =>
    Object.keys(obj).reduce((acc, key) => ({
        ...acc,
        [`${prefix}-${key}`]: obj[key]
    }), {});

module.exports = {
    trendFilter: async (trend) => {

        const addTrendWithHistoricals = async (trend, interval, span) => {
            // add historical data
            let allHistoricals = await getMultipleHistoricals(
                trend.map(buy => buy.ticker),
                `interval=${interval}&span=${span}`
            );
    
            let withHistoricals = trend.map((buy, i) => ({
                ...buy,
                [`${span}Historicals`]: allHistoricals[i]
            }));
    
            return withHistoricals;
        };

        const trendWithHistoricals = (await addTrendWithHistoricals(trend, 'day', 'year'))
            .filter(buy => buy.yearHistoricals && buy.yearHistoricals.length);

        const stratResults = await mapLimit(Object.keys(strategies), 2, async stratName => {
            const asyncStrat = strategies[stratName];
            return {
                stratName,
                results: await asyncStrat(trendWithHistoricals)
            };
        });
        
        return stratResults.reduce((acc, { stratName, results }) => ({
            ...acc,
            ...prefixKeys(results, stratName)
        }), {});

    },
    run: [4, 95, 180, 250, 345],
    trendFilterKey: ['under5', 'sp500'],
    name: 'analytic'
};