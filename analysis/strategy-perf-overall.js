// gets current strategy performance of picks looking back n days
const NUM_DAYS = 2;

const fs = require('mz/fs');
const { analyzeDay } = require('../app-actions/record-strat-perfs');
const jsonMgr = require('../utils/json-mgr');
const { avgArray } = require('../utils/array-math');

const strategyPerfToday = require('./strategy-perf-today');
const StratPerf = require('../models/StratPerf');

class HashTable {
    constructor() {
        this.hashes = {};
    }
    put ( key, value ) {
        this.hashes[ JSON.stringify( key ) ] = value;
    }
    get ( key ) {
        return this.hashes[ JSON.stringify( key ) ];
    }
    keys () {
        return Object.keys(this.hashes)
            .map(hash => JSON.parse(hash));
    }
    print () {
        console.log(JSON.stringify(this.hashes, null, 2));
    }
}

module.exports = async (includeToday, daysBack = NUM_DAYS, minCount = 0, skipDays, maxCount = Number.POSITIVE_INFINITY, stratFilter = '') => {
    console.log('includeToday', includeToday);
    console.log('days back', daysBack);
    console.log('mincount', minCount);

    

    const paramTrue = val => val && val.toString() === 'true';
    let dates = await StratPerf.getUniqueDates();

    if (skipDays === 'true') { 
        dates.pop();
    } else if (skipDays) {
        dates = dates.slice(0, dates.length - skipDays);
    }
    
    let threeMostRecent = dates.slice(0 - daysBack);
    console.log('selected days', threeMostRecent);

    const stratResults = new HashTable();
    for (let day of threeMostRecent) {

        const dayStrats = await StratPerf.getByDate(day);
        Object.keys(dayStrats).forEach(period => {

            const sellMin = Number(period.substring(period.lastIndexOf('-') + 1));
            if (period !== 'next-day-9') return; // only consider 9 minute sell times
            dayStrats[period].forEach(stratPerf => {
                const { strategyName, avgTrend } = stratPerf;
                if (!strategyName.includes(stratFilter)) return;
                if (avgTrend > 100) return;       // rudimentary filter out reverse splits's
                const negMin = strategyName.includes('--');
                const split = strategyName.split('-');
                let buyMin = Number(split.pop());
                buyMin = negMin ? 0 - buyMin : buyMin;
                let strategyWithoutMin = split.join('-');
                if (strategyWithoutMin.endsWith('-')){
                    strategyWithoutMin = strategyWithoutMin.substring(0, strategyWithoutMin.length-1);
                }
                const key = {
                    strategyName: strategyWithoutMin,
                    buyMin,
                    // sellMin
                };
                
                stratResults.put(key, (stratResults.get(key) || []).concat(avgTrend));
            });

        });
    }

    // should includetoday?
    if (paramTrue(includeToday) || typeof includeToday === 'object') {
        console.log('adding today');
        let todayPerf = typeof includeToday === 'object' ? includeToday : await strategyPerfToday();
        todayPerf = todayPerf.filter(p => p.strategyName.includes(stratFilter));
        // console.log(JSON.stringify({ todayPerf }, null, 0))
        todayPerf.forEach(perf => {
            let { strategyName, avgTrend, min } = perf;
            // if (!strategyName.includes('best-st-sentiment-under5')) return;
            console.log({ strategyName, avgTrend, min });
            // const minDelim = strategyName.includes('--') ? '--' : '-';
            // const lastDash = strategyName.lastIndexOf(minDelim);
            // const buyMin = typeof min !== 'undefined' ? min : Number(strategyName.substring(lastDash + 1));
            // strategyName = strategyName.substring(0, lastDash);

            const key = {
                strategyName,
                buyMin: min
            };

            // const curCount = (stratResults.get(key) || []).length;
            // console.log(curCount, 'curcount');
            // console.log(key, 'key', avgTrend);

            // const trendCurCountTimes = Array(curCount || 1).fill(avgTrend);
            stratResults.put(key, (stratResults.get(key) || []).concat(avgTrend));
        });
        // console.log('turkey true', todayPerf);
    }

    stratResults.keys().forEach(keyObj => {
        const arrayOfTrends = stratResults.get(keyObj);
        stratResults.put(keyObj, {
            avgTrend: avgArray(arrayOfTrends),
            count: arrayOfTrends.length,
            trends: arrayOfTrends
        });
    });

    const allPerfs = [];
    stratResults.keys().forEach(keyObj => {
        const strategyPerformance = stratResults.get(keyObj);
        allPerfs.push({
            ...keyObj,
            ...strategyPerformance
        });
    });
    // stratResults.print();

    // console.log('all', JSON.stringify(allPerfs, null, 2));

    const withoutPerms = allPerfs
        // .filter(({ strategyName }) => {
        //     console.lop('filter, st', strategyName, strategyName.includes('best-st'));
        //     return strategyName.includes('best-st');
        // })
        .filter(({ strategyName }) => {
            const lastChunk = strategyName.substring(strategyName.lastIndexOf('-') + 1);
            return ![
                // 'single', 
                'first3'
            ].includes(lastChunk);
        })
        .filter(perf => perf.count >= minCount && perf.count <= maxCount);

    const withData = withoutPerms.map(({ strategyName, avgTrend, buyMin, trends, count }) => ({
        name: strategyName + '-' + buyMin,
        avgTrend,
        trends: trends.map(t => Math.round(t)),
        percUp: trends.map(t => Math.round(t)).filter(t => t > 0).length / trends.length,
        hundredResult: trends.reduce((acc, val) => {
            return acc * (100 + val) / 100;
        }, 100),
        count
    }));

    const sortedByAvgTrend = withData
        .sort((a, b) => b.avgTrend - a.avgTrend)
        .slice(0);

    // console.log(sortedByAvgTrend);
    // console.log('sorted by avg trend')
    // console.table(sortedByAvgTrend);

    const sortedByPercUp = withData
        // .filter(t => t.trend.length > 30)
        // .filter(t => t.trends.filter(trend => trend < 0).length < 8)
        .sort((a, b) => {
            return (b.percUp == a.percUp) ? b.avgTrend - a.avgTrend : b.percUp - a.percUp;
        })
        .slice(0);

    // console.log('sorted by perc up')
    // console.table(sortedByPercUp);

    const sortedByHundredResult = withData
        // .filter(t => t.trend.length > 30)
        // .filter(t => t.percUp === 1)
        // .filter(t => t.name.includes('low-float'))
        .sort((a, b) => {
            return (b.hundredResult == a.hundredResult) ? b.avgTrend - a.avgTrend : b.hundredResult - a.hundredResult;
        })
        .slice(0);

    // console.log('sorted by hundred result')
    // console.table(sortedByHundredResult);

    console.log('done getting strat perf overall')



    return {
        sortedByAvgTrend,
        sortedByPercUp,
        sortedByHundredResult
    };

};
