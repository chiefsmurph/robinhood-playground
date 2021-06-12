
const initStratPerfs = require('./init-strat-perfs');
const calcUniqStrategies = require('./calc-uniq-strategies');
const analyzeStrategy = require('./analyze-strategy');
const { analyzeRoundup } = require('./generate-breakdowns');
const { isBreakdownKey } = require('../../utils/breakdown-key-compares');
const saveToJson = require('./save-to-json');

export default async (daysBack = 2, skipDays = 0, ...strategiesArgs) => {
    daysBack = Number(daysBack);
    skipDays = Number(skipDays);
    console.log('days back', daysBack);

    let maxBreakdownKey = (() => {
        if (strategiesArgs.length && isBreakdownKey(strategiesArgs[0])) {
            // optional argument
            // for example: node run analysis/strategy-perf-multiple 52 next-day-330 list-of-strategies... 2... etc...
            const breakdownArg = strategiesArgs.shift();
            console.log('max breakdown key set to...', breakdownArg);
            return breakdownArg;
        }
    })();

    const { days, stratObj } = await initStratPerfs(daysBack, skipDays);
    console.log({ days })
    // console.log(JSON.stringify({ days, stratObj }, null, 2));
    let allStrategies = calcUniqStrategies(stratObj);

    const suppliedStrategies = strategiesArgs.length;

    let isSearch = false;
    const strategiesOfInterest = (() => {
        if (!suppliedStrategies) {
            return allStrategies;
        }
        const filteredStrats = allStrategies.filter(strat =>
                strategiesArgs.includes(strat)
                || (() => {
                    const matchSearch = strategiesArgs.every(s => strat.includes(s));
                    isSearch = isSearch || matchSearch;
                    return matchSearch;
                })()
        );
        return filteredStrats;
    })();
    const includeDetailed = suppliedStrategies && !isSearch;
    console.log({
        includeDetailed,
        suppliedStrategies
    })
    if (suppliedStrategies) {
        console.log('strategies of interest', strategiesOfInterest);
        console.log('isSearch', isSearch);
        console.log('includeDetailed', includeDetailed);
    }
    console.log('num strategies', strategiesOfInterest.length);

    const allRoundup = strategiesOfInterest.map((strategyName, index) => {
        const strategyAnalysis = analyzeStrategy({
            strategyName,
            stratObj,
            detailed: includeDetailed,
            maxBreakdownKey
        });
        if (index % 50 === 0) {
            console.log(index + 1, '/', strategiesOfInterest.length);
        }
        return strategyAnalysis;
    });

    console.log('done analyzing strategies')

    if (includeDetailed) {
        return allRoundup;
    }

    const analyzed = analyzeRoundup(allRoundup);
    if (daysBack > 15) {
        console.log('saving to json');
        await saveToJson(analyzed, days.pop());
    }
    return analyzed;

};
