// predict how many picks a strategy offers / day
const stratPerfOverall = require('./strategy-perf-overall');
const createPredictionModels = require('../socket-server/create-prediction-models');
const manual = require('../pms/manual');
const { avgArray } = require('../utils/array-math');

const NUM_DAYS = [
    6,
    25,
    52
];

module.exports = async (dollars, ...strategies) => {

    // strategies = manual.lilMore;

    if (!strategies.length) {
        console.log('no strategies supplied.  creating prediction models and using forPurchase');
        strategies = (
            await createPredictionModels()
        ).forPurchase;
    }

    
    const byStrategy = {};
    const stratPerfCollections = await mapLimit(NUM_DAYS, 1, async dayCount => ({
        dayCount,
        stratPerfs: (await stratPerfOverall(true, dayCount, 0)).sortedByAvgTrend
    }));
    
    stratPerfCollections.forEach(({ dayCount, stratPerfs }) => {
        stratPerfs.forEach(({ name, trends }) => {
            byStrategy[name] = (byStrategy[name] || [])
                .concat({
                    dayCount: dayCount + 1, /// because includeToday
                    trendCount: trends.length,
                });
        });
    });

    const stratToFreq = {};
    Object.keys(byStrategy).forEach(strategy => {
        let lastTrend = {};
        byStrategy[strategy] = byStrategy[strategy]
            .map(strat => {
                const returnObj = {
                    ...strat,
                    newDayCount: strat.dayCount - (lastTrend.dayCount || 0),
                    newTrendCount: strat.trendCount - (lastTrend.trendCount || 0)
                };
                lastTrend = strat;
                return returnObj;
            })
            .filter(strat => strat.newTrendCount)
            .map(strat => ({
                ...strat,
                dailyFreq: strat.newTrendCount / strat.newDayCount
            }));
        stratToFreq[strategy] = avgArray(
            byStrategy[strategy].map(s => s.dailyFreq)
        );
    });

    str(byStrategy);

    const analyzed = strategies.map(strategy => ({
        strategy,
        dailyFreq: stratToFreq[strategy]
    }));

    const totalDailyFreq = analyzed.reduce(
        (acc, trend) => 
            trend && trend.dailyFreq 
                ? acc + trend.dailyFreq : 
                acc,
        0
    );

    str(analyzed);

    return {
        totalDailyFreq,
        estimatedPurchaseAmt: Number(dollars) / totalDailyFreq
    };

}