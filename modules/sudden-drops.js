// utils
const getTrend = require('../utils/get-trend');

// rh-actions
const getRisk = require('../rh-actions/get-risk');

// app-actions
const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');
const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');

//npm
const mapLimit = require('promise-map-limit');

const PERMUTATIONS = {
    inners: {
        firsts: [1, 2, 3],
        trendCounts: [1, 2, 3, 4],
            // 5, 10, 18, 30, 50],
        filterPercs: [7, 12, 17, 26]
    },
    outers: {
        trendPercs: [5, 10, 15, 20, 30],
        volumes: [10000, 100000, 500000, 1000000, 2500000, 500000],
        combos: [
            {
                volume: 100000,
                trendPerc: 15
            }
        ]
    }
};

const getResults = withHistoricals => {
    // console.log(withHistoricals)
    const perms = PERMUTATIONS.inners.trendCounts;
    let withQuickTrends = withHistoricals
        .map(buy => {
            const lastClose = buy.historicals[buy.historicals.length - 1].close_price;
            return {
                ...buy,
                ...perms.reduce((acc, val) => {
                    const pastHistorical = buy.historicals[buy.historicals.length - val];
                    return {
                        ...acc,
                        ...pastHistorical && {
                            [`last${val}trend`]: getTrend(lastClose, pastHistorical.open_price)
                        }
                    };
                }, {})
            };
        });

    const mapTicks = trend => trend.map(buy => buy.ticker);
    const firstPerms = (lastVal, ofInterest) => ({

        // ...PERMUTATIONS.inners.firsts.reduce((acc, val) => ({
        //     ...acc,
        //     [`last${lastVal}trend-first${val}`]: mapTicks(ofInterest.slice(0, val)),
        // }), {}),

        ...PERMUTATIONS.inners.filterPercs.reduce((acc, val) => ({
            ...acc,
            [`last${lastVal}trend-filter${val}`]: mapTicks(
                ofInterest.filter(trend => trend[`last${lastVal}trend`] < 0 - val)
            ),
        }), {})

    });

    // console.log(
    //     JSON.stringify(
    //         withQuickTrends
    //             .map((trend) => {
    //                 delete trend.historicals;
    //                 return trend;
    //             }),
    //         null,
    //         2
    //     )
    // );
    return perms
        .filter(val => withQuickTrends.some(buy => !!buy[`last${val}trend`]))
        .reduce((acc, val) => ({
            ...acc,
            ...firstPerms(
                val,
                withQuickTrends
                    .sort((a, b) => a[`last${val}trend`] - b[`last${val}trend`])
            )
        }), {});

};

const prepareTrend = async (trend, min) => {
    // add fundamentals
    const withOvernightJump = await addOvernightJumpAndTSO(trend);
    const onlyWithFundamentals = withOvernightJump
        .filter(stock => stock.fundamentals)
        .filter(stock => Math.abs(stock.overnightJump) < 6)
        .filter(stock => stock.trendSinceOpen < 8);

    // add historicals

    let histQS = `interval=5minute`;
    const isNotRegularTrading = min < 0 || min >= 390;
    if (false && isNotRegularTrading) histQS += '&bounds=extended';
    // console.log({ isNotRegularTrading })
    let allHistoricals = await getMultipleHistoricals(
        onlyWithFundamentals.map(buy => buy.ticker),
        histQS
    );

    let withHistoricals = onlyWithFundamentals.map((buy, i) => ({
        ...buy,
        historicals: allHistoricals[i]
    })).filter(buy => !!buy.historicals && buy.historicals.length);

    // get risk (should watchout / not watchout)
    let withRisk = await mapLimit(withHistoricals, 1, async buy => ({
        ...buy,
        ...await getRisk(buy)
    }));
    return withRisk;
};

const permuteByTrendAndVolume = (trend) => {
    const trendPerms = PERMUTATIONS.outers.trendPercs.reduce((acc, val) => ({
        ...acc,
        [`bothtrendsAbsLT${val}`]: t => 
            Math.abs(t.trend_since_prev_close) <= val
            && Math.abs(t.trendSinceOpen) <= val,
        [`prevCloseTrendAbsLT${val}`]: t => Math.abs(t.trend_since_prev_close) <= val,
        [`tsoAbsLT${val}`]: t => Math.abs(t.trendSinceOpen) <= val,
    }), {});

    const volumePerms = PERMUTATIONS.outers.volumes.reduce((acc, val) => ({
        ...acc,
        [`volumeGT${val}`]: t => t.fundamentals.volume >= val,
    }), {});

    // console.log({volumePerms})

    const mainPermutations = {
        ...trendPerms,
        ...volumePerms
    };

    return Object.keys(mainPermutations).reduce((acc, permKey) => {
        const filterFn = mainPermutations[permKey];
        const filteredTrend = trend.filter(filterFn);
        const result = getResults(filteredTrend);
        const withPrefix = Object.keys(result).reduce((innerAcc, innerKey) => ({
            ...innerAcc,
            [`${permKey}-${innerKey}`]: result[innerKey]
        }), {});
        return {
            ...acc,
            ...withPrefix
        };
    }, {});
};

const permuteByWatchout = trend => {
    // console.log(trend.filter(t => t.shouldWatchout));
    return [true, false].reduce((acc, watchoutValue) => {
        const filteredTrend = trend.filter(t => t.shouldWatchout === watchoutValue);
        const result = {
            ...getResults(filteredTrend),
            ...permuteByTrendAndVolume(filteredTrend)
        };
        const watchoutKey = watchoutValue ? 'shouldWatchout' : 'notWatchout';
        const withPrefix = Object.keys(result).reduce((innerAcc, innerKey) => ({
            ...innerAcc,
            [`${watchoutKey}-${innerKey}`]: result[innerKey]
        }), {});
        return {
            ...acc,
            ...withPrefix
        };
    }, {});
};

const trendFilter = async (trend, min) => {
    trend = await prepareTrend(trend, min);
    let returnObj = {
        ...getResults(trend),
        ...permuteByTrendAndVolume(trend),
        ...permuteByWatchout(trend)
    };
    const tickers = {};
    returnObj = Object.keys(returnObj)
        .filter(key => returnObj[key].length === 1)
        .reduce((acc, key) => {
            returnObj[key].forEach(ticker => {
                tickers[ticker] = ++tickers[ticker] || 1;
            });
            return {
                ...acc,
                [key]: returnObj[key]
            };
        }, {});
    Object.keys(tickers).forEach(ticker => {
        const count = tickers[ticker];
        const key = `count${count}`;
        returnObj[key] = [
            ...returnObj[key] || [],
            ticker
        ];
    });
    returnObj.allTicks = Object.keys(tickers);
    return returnObj;
};

const suddenDrops = {
    name: 'sudden-drops',
    trendFilter,
    // run: [-50, -30, -10, 3, 14, 32, 63, 100, 153, 189, 221, 280, 290, 328, 360, 388, 400, 430, 470, 500]
};

module.exports = suddenDrops;
