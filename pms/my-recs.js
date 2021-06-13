const stratPerfOverall = require('../analysis/strategy-perf-overall');
const strategyPerfToday = require('../analysis/strategy-perf-today');

const { uniqifyArrayOfStrategies } = require('../utils/uniqify-stuff');

module.exports = async () => {

    const todayPerf = await strategyPerfToday();

    const perms = [
        {
            dayCount: 1,
            minCounts: [1]
        },
        {
            dayCount: 3,
            minCounts: [2, 4]
        },
        {
            dayCount: 5,
            minCounts: [2, 3, 4]
        },
        {
            dayCount: 7,
            minCounts: [3, 5]
        },
        {
            dayCount: 10,
            minCounts: [2, 5, 7, 9]
        },
        {
            dayCount: 15,
            minCounts: [2, 5, 9, 13]
        },
        {
            dayCount: 20,
            minCounts: [2, 5, 10, 13, 17]
        },
        {
            dayCount: 30,
            minCounts: [7, 13, 22]
        },
        {
            dayCount: 40,
            minCounts: [7, 18, 24, 30]
        }
    ];

    const additionalVariations = {
        count2to4: () => pick => pick.count >= 2 && pick.count <= 4,
        creme: (stratPerfOverall, dayCount) => {
            console.log(stratPerfOverall, dayCount, 'buritto');
            const getWhileLoopCreme = stratPerf => {
                let curMinPercUp = 1;
                let curMinAvgTrend = 2.9;
                let numResults = null;
                let uniqified = [];
                let attempts = 0;
                while (
                    (stratPerf.length && attempts < 200)
                    && (!numResults || numResults > 3)
                ) {
                    console.log('curMinPercUp', curMinPercUp, 'numResults', numResults, 'curMinAvgTrend', curMinAvgTrend, 'stratPerf count', stratPerf.length);
                    const percUpFiltered = stratPerf.filter(pick => pick.percUp >= curMinPercUp);
                    const avgTrendFiltered = percUpFiltered.filter(pick => pick.avgTrend >= curMinAvgTrend);
                    uniqified = uniqifyArrayOfStrategies(avgTrendFiltered);
                    numResults = uniqified.length;

                    if (!numResults) {
                        if (curMinPercUp > 0.7) curMinPercUp -= 0.01;
                        curMinAvgTrend -= 0.1;
                    } else if (numResults > 3) {
                        curMinAvgTrend += 0.2;
                    }
                    console.log(numResults, curMinPercUp, curMinAvgTrend);
                    attempts++;
                }
                return uniqified;
            };

            const getHundredResultCreme = stratPerf => {

                console.log('stratPerf', stratPerf);
                const top10 = stratPerf.slice(0, 10);
                const sortedByHundredResult = top10.sort((a, b) => b.hundredResult - a.hundredResult);
                const topPick = sortedByHundredResult[0];
                return topPick ? [topPick] : [];

            };

            const minCount = Math.ceil(dayCount * 0.69);
            const countFiltered = stratPerfOverall.filter(pick => pick.count >= minCount);
            const allGt1 = countFiltered.filter(
                pick => pick.trends.every(t => t > 1)
            );

            return {
                whileLoopCreme: getWhileLoopCreme(countFiltered),
                'whileLoopCreme-allGt1': getWhileLoopCreme(allGt1),
                hundredResultCreme: getHundredResultCreme(countFiltered),
                'hundredResultCreme-allGt1': getHundredResultCreme(allGt1)
            };

        }
    };

    let resultObj = {};

    const getNames = arr => arr.map(pick => pick.name);
    const addPM = picksObj => {
        resultObj = {
            ...resultObj,
            ...picksObj
        };
    };
    const uniqifyAndAddPM = (prefix, picksObj) => {
        const withUniq = (name, list) => {
            const names = getNames(list);
            const uniqNames = getNames(uniqifyArrayOfStrategies(list));
            const slice16Uniq = getNames(uniqifyArrayOfStrategies(list.slice(0, 16)));
            const isSame = arr => names.toString() === arr.toString();
            return {
                [`${prefix}-${name}`]: getNames(list),
                [`${prefix}-${name}-single`]: getNames(list.slice(0, 1)),
                ...!isSame(uniqNames) && { [`${prefix}-uniq-${name}`]: uniqNames },
                ...!isSame(slice16Uniq) && { [`${prefix}-slice16-uniq-${name}`]: slice16Uniq },
            };
        };
        const picksObjWithUniq = Object.keys(picksObj).reduce((acc, val) => ({
            ...acc,
            ...withUniq(
               val,
               picksObj[val]
            )
        }), {});
        addPM(picksObjWithUniq);
    };

    const createPicksObjFromSortedByPercUp = (sortedByPercUp, dayCount) => {
        const hundredUpPicks = sortedByPercUp
            .filter(pick => pick.percUp === 1);

        const hundredUpAvgGt4 = hundredUpPicks
            .filter(pick => pick.avgTrend > 4);

        const hundredUpTrendsAllGt1 = hundredUpAvgGt4
            .filter(pick => pick.trends.every(t => t > 1));

        const hundredWithHundredCheck = hundredUpTrendsAllGt1
            .filter(pick => pick.hundredResult > 135);

        const picksObj = {
            hundredUpPicks,
            hundredUpAvgGt4,
            hundredUpTrendsAllGt1,
            hundredWithHundredCheck,
        };

        return picksObj;
    };

    for (let { dayCount, minCounts } of perms) {
        // console.log('here')
        let { sortedByPercUp } = await stratPerfOverall(todayPerf, dayCount);
        sortedByPercUp = sortedByPercUp.filter(o => !o.name.includes('ticker-watchers'));
        // console.log('hi')
        const filterSortedByPercUpAndAddToResults = (variationName, filterFn) => {
            const prefix = `day${dayCount}${variationName}`;
            const filteredStratPerf = sortedByPercUp.filter(filterFn);
            // console.log('---filtered')
            const picksObj = createPicksObjFromSortedByPercUp(filteredStratPerf, dayCount);
            // console.log('---picksobj')
            uniqifyAndAddPM(prefix, picksObj);
            // console.log('---uniq')
        };
        console.log('defined');

        minCounts.forEach(minCount => {
            console.log('bingo');
            filterSortedByPercUpAndAddToResults(
                `count${minCount}`,
                pick => pick.count >= minCount
            );
            console.log('bango')
        });

        // Object.entries(additionalVariations).forEach(([variationName, variation]) => {
        //     const filterFn = variation(sortedByPercUp, dayCount);
        //     filterSortedByPercUpAndAddToResults(
        //         variationName,
        //         filterFn
        //     );
        //     uniqifyAndAddPM(`day${dayCount}${variationName}`, picksObj);
        // });

        // add count2to4
        filterSortedByPercUpAndAddToResults(
            'count2to4',
            additionalVariations.count2to4
        );

        // add cremeObj (1 / dayCount)
        const cremeObj = additionalVariations.creme(
            sortedByPercUp,
            dayCount
        );
        const cremeObjWithPrefix = Object.keys(cremeObj).reduce((acc, val) => ({
            ...acc,
            [`day${dayCount}-${val}`]: getNames(cremeObj[val])
        }), {});
        addPM(cremeObjWithPrefix);

        console.log('done')
    }

    return resultObj;

};
