const {
    compareTwoBreakdowns,
    // orderBreakdownKeys
} = require('../../utils/breakdown-key-compares');

const analyzeDay = ({ strategyName, stratPerf, date, maxBreakdownKey }) => {

    const maxBreakdownFilter = key => !maxBreakdownKey
        ? true
        : compareTwoBreakdowns(key, maxBreakdownKey) <= 0;

    const foundTrends = [];
    Object.keys(stratPerf)
        // .filter(key => key.includes('next-day-9'))
        .filter(maxBreakdownFilter)
        .forEach(key => {
            const foundObj = stratPerf[key].find(obj => obj.strategyName === strategyName);
            foundObj && foundTrends.push({
                ...foundObj,
                key
            });
        });

    // console.log(foundTrends);

    const allKeys = foundTrends.map(obj => obj.key);
    const requiredKeys = ['next-day-9'];

    if (
        allKeys.length < 0
        // !requiredKeys.every(key => allKeys.includes(key))
    ) {
        // console.log('has', allKeys);
        return {
            notEnoughError: true
        };
    }

    if (!foundTrends.length) {
        return null;
    }

    const sorted = foundTrends.sort((a, b) => b.avgTrend - a.avgTrend);

    // console.log('sorted', sorted);
    const trends = foundTrends.map(trend => trend.avgTrend);

    const {
        key: winnerTime,
        avgTrend: maxUp,
        picks
    } = sorted[0];

    // if (maxUp > 50) {
    //     console.log('found big one')
    //     console.log(sorted[0], date);
    // }

    const breakdowns = foundTrends
        .sort((a, b) => compareTwoBreakdowns(a.key, b.key))
        .reduce((acc, { key, avgTrend }) => ({
            ...acc,
            [key]: avgTrend
        }), {});

    const stats = {
        didGoUp: trends.some(trend => trend > 0),
        maxUp,
        winnerTime,
        date,
        picks,
        breakdowns
    };

    return stats;
};

module.exports = analyzeDay;
