// app-actions
const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');
// npm
const mapLimit = require('promise-map-limit');

// rh-actions
const getRisk = require('../rh-actions/get-risk');
const trendingUp = require('../rh-actions/trending-up');

const trendFilter = async (trend) => {
    // going up at least 3%

    console.log('running dynamo-3000 strategy');

    console.log('total trend stocks', trend.length);

    let withTrendSinceOpen = await addOvernightJumpAndTSO(trend);
    withTrendSinceOpen = withTrendSinceOpen
        .filter(buy => buy.trendSinceOpen)
        .sort((a, b) => a.trendSinceOpen - b.trendSinceOpen);

    const theMiddle = Math.floor(withTrendSinceOpen.length / 2);
    const tsoBreakdowns = [
        {
            name: 'bottom50tso',
            trend: withTrendSinceOpen.slice(0, 50)
        },
        {
            name: 'middle50tso',
            trend: withTrendSinceOpen.slice(theMiddle - 25, theMiddle + 25)
        },
        {
            name: 'top50tso',
            trend: withTrendSinceOpen.slice(-50)
        },
        {
            name: 'overall',
            trend: withTrendSinceOpen.slice(0)
        }
    ];

    const getTicks = arr => arr.map(buy => buy.ticker);

    const allVariations = (stratname, trend) => {
        const withYearPosition = trend
            .map(buy => {
                const { fundamentals } = buy;
                if (!fundamentals) return buy;
                const { low_52_weeks, high_52_weeks } = fundamentals;
                const total = Number(low_52_weeks) + Number(high_52_weeks);
                const perc = buy.last_trade_price / total;
                return {
                    ...buy,
                    yearPosition: perc,
                    peRatio: buy.fundamentals.pe_ratio,
                    sharesToCap: buy.fundamentals.shares_outstanding / buy.fundamentals.market_cap
                };
            });

        const highestLowest = (acronym, key) => {
            const filtered = withYearPosition.filter(buy => !!buy[key]);
            const firstFiveBySort = (sortFn) => getTicks(
                filtered
                    .sort(sortFn)
                    .slice(0, 2)
            );
            return {
                [`${stratname}-lowest${acronym}`]: firstFiveBySort(
                    (a, b) => a[key] - b[key]
                ),
                [`${stratname}-highest${acronym}`]: firstFiveBySort(
                    (a, b) => b[key] - a[key]
                )
            };
        };

        return {
            [stratname]: getTicks(trend),
            ...highestLowest('TSO', 'trendSinceOpen'),  // lowest trend since open is still > 3%
            ...highestLowest('YP', 'yearPosition'),
            ...highestLowest('sharesToCap', 'sharesToCap')
        };
    };

    const volumePerms = (trend, keyPrefix) => {
        const withVolume = trend.map(buy => ({
            ...buy,
            volumetoavg: buy.fundamentals.volume / buy.fundamentals.average_volume,
            volumeto2weekavg: buy.fundamentals.volume / buy.fundamentals.average_volume_2_weeks,
            twoweekvolumetoavg: buy.fundamentals.average_volume_2_weeks / buy.fundamentals.average_volume,
            absvolume: buy.fundamentals.volume
        }));
        return [
            'absvolume',
            'volumetoavg',
            'volumeto2weekavg',
            'twoweekvolumetoavg'
        ].reduce((acc, key) => ({
            ...acc,
            [`${keyPrefix ? keyPrefix + '-' : ''}${key}`]: getTicks(
                trend
                    .sort((a, b) => b[key] - a[key])
                    .slice(0, 2)
            )
        }), {});
    };

    const allVariationsForTsoBreakdown = async ({ name, trend: trendFilteredByTSO }) => {
        console.log('trendFilter', name, 'count', trendFilteredByTSO.length);
        let withTrendingUp = await mapLimit(trendFilteredByTSO, 20, async buy => ({
            ...buy,
            ...(await getRisk(buy)),
            // trendingUp30: await trendingUp(buy.ticker, [ 30 ]),
            trendingUp3010: await trendingUp(buy.ticker, [ 30, 10 ]),
            // trendingUp10: await trendingUp(buy.ticker, [ 10 ]),
        }));

        console.log(
            'num watchout',
            withTrendingUp.filter(buy => buy.shouldWatchout).length
        );
        console.log(
            'trendingUp3010',
            withTrendingUp.filter(buy => buy.trendingUp3010).length
        );

        const allFilters = withTrendingUp.filter(
            buy => buy.trendingUp3010 && !buy.shouldWatchout
        );

        console.log('final length num count', withTrendingUp.length);
        // console.log(withTrendingUp);
        const topPe = withTrendingUp
            .map(buy => ({
                ...buy,
                peRatio: buy.fundamentals.pe_ratio
            }))
            .filter(buy => buy.peRatio)
            .sort((a, b) => b.peRatio - a.peRatio)
            .slice(0, 3);

        return {
            ...allVariations(`${name}-overall`, withTrendingUp),
            // ...allVariations(`${name}-trendingUp10`, withTrendingUp.filter(buy => buy.trendingUp10)),
            ...allVariations(`${name}-trendingUp3010`, withTrendingUp.filter(buy => buy.trendingUp3010)),
            // ...allVariations(`${name}-trendingUp30`, withTrendingUp.filter(buy => buy.trendingUp30)),
            ...allVariations(`${name}-notWatchout`, withTrendingUp.filter(buy => !buy.shouldWatchout)),
            ...allVariations(`${name}-shouldWatchout`, withTrendingUp.filter(buy => buy.shouldWatchout)),
            [`${name}-allFilters`]: getTicks(allFilters),
            ...volumePerms(withTrendingUp, name),
            [`${name}-topPE`]: getTicks(topPe)
        };
    };

    let returnObj = {
        ...volumePerms(withTrendSinceOpen)
    };
    for (let obj of tsoBreakdowns) {
        returnObj = {
            ...returnObj,
            ...await allVariationsForTsoBreakdown(obj),
        };
    }
    return returnObj;
};

const dynamo3000 = {
    name: 'dynamo-3000',
    trendFilter,
    // run: [4, 40, 100, 200, 260, 351, 381],
};

module.exports = dynamo3000;
