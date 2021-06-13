
const recordPicks = require('./record-picks');
const getTrendBreakdowns = require('./get-trend-breakdowns');

const executeStrategy = async (strategyFn, min, ratioToSpend, strategy, trendFilterKey) => {

    await new Promise(resolve => setTimeout(resolve, 1000 * 5));   // 5 secs


    // TODO: refactor this fn
    if (trendFilterKey === null || (trendFilterKey && !trendFilterKey.length)) {
        const toPurchase = strategyFn(null, min, null);
        await recordPicks(strategy, min, toPurchase);
    }

    const trendBreakdowns = await getTrendBreakdowns(min);
    delete trendBreakdowns.all;
    
    if (trendFilterKey) {
        Object.keys(trendBreakdowns)
            .filter(trendKey => !trendFilterKey.includes(trendKey))
            .forEach(trendKey => {
                console.log('deleting', trendKey);
                delete trendBreakdowns[trendKey];
            });
    }

    for (let trendKey of Object.keys(trendBreakdowns)) {
        const trend = trendBreakdowns[trendKey];
        const toPurchase = await strategyFn(trend, min, trendKey);
        const trendFilterKey = (trendKey === 'under5') ? '' : trendKey;
        await recordPicks(strategy, min, toPurchase, trendFilterKey);
    }


};

module.exports = executeStrategy;
