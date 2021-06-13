const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');
const getRisk = require('../rh-actions/get-risk');
const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');
const { addEMAs } = require('./indicators');
const cTable = require('console.table');
const { avgArray, percUp } = require('../utils/array-math');
const { omit } = require('underscore');
const getTrend = require('../utils/get-trend');
const getStSent = require('../utils/get-stocktwits-sentiment');
const alpacaLimitBuy = require('../alpaca/limit-buy');
const lookup = require('../utils/lookup');
const request = require('request-promise');
const getTrendSinceOpen = require('../rh-actions/get-trend-since-open');

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

const trendFilter = async (trend) => {

    const response = {};

    // console.log({ trend })
    console.log('adding overnite jump')
    let withOvernight = await addOvernightJumpAndTSO(trend);
    console.log('adding historicals')
    const withHistoricals = (
        await addTrendWithHistoricals(withOvernight, 'day', 'year')
    ).filter(b => b.yearHistoricals.length > 200);
    console.log('adding risk')
    const withRisk = await mapLimit(withHistoricals, 20, async buy => ({
        ...buy,
        ...(await getRisk(buy)),
    }));
    console.log('burrito wrap up');
    const withEMAs = addEMAs(withRisk);

    const topQuarterBySort = (arr, sort) => {
        const sorted = arr.sort(sort);
        return sorted.slice(0, Math.floor(sorted.length / 4))
    };
    const withRatios = withEMAs.map(b => ({
        ...b,
        fiveTo35ratio: b.open.fiveTrend - b.open.ema35trend,
        thirtyFiveTo90ratio: b.open.ema35trend - b.open.ema90trend,
        volumeRatio: Number(b.fundamentals.average_volume_2_weeks) / Number(b.fundamentals.average_volume),
    }));

    const topQuarterVolRatio = topQuarterBySort(withRatios, (a, b) => b.volumeRatio - a.volumeRatio);
    const topQuarterVol2Week = topQuarterBySort(withRatios, (a, b) => b.fundamentals.average_volume_2_weeks - a.fundamentals.average_volume_2_weeks);
    const topQuarterVolAvg = topQuarterBySort(withRatios, (a, b) => b.fundamentals.average_volume - a.fundamentals.average_volume);
    
    const allGoodVol = withRatios.filter(
        buy => [topQuarterVolRatio, topQuarterVol2Week, topQuarterVolAvg].some(
            collection => collection.some(b => b.ticker === buy.ticker)
        )
    );

    let onlyQuality = allGoodVol
        .filter(b => 
            !b.shouldWatchout
            && Math.abs(b.overnightJump) < 3
            // && b.overnightJump >= 0
            && b.open.ema3trend > 0
        )
        .map(t => ({
            ...t,
            hit2down: getTrend(t.fundamentals.low, t.fundamentals.open) < -1,
            hit2up: getTrend(t.fundamentals.high, t.fundamentals.open) > 1,
        }))
        .map(t => ({
            ...t,
            ...t.hit2down ? {
                ts2down: getTrend(t.last_trade_price, t.fundamentals.open * .99)
            } : {},
            ...t.hit2up ? {
                ts2up: getTrend(t.last_trade_price, t.fundamentals.open * 1.01)
            } : {}
        }));

    str({
        withRatios: withRatios.length,
        topQuarterVolRatio: topQuarterVolRatio.map(b => b.ticker).slice(0, 20),
        topQuarterVol2Week: topQuarterVol2Week.map(b => b.ticker).slice(0, 20),
        topQuarterVolAvg: topQuarterVolAvg.map(b => b.ticker).slice(0, 20),
        allGoodVol: allGoodVol.length,
        onlyQuality: onlyQuality.length
    });

    // onlyQuality = await mapLimit(onlyQuality, 13, async buy => ({
    //     ...buy,
    //     stSent: (await getStSent(buy.ticker) || {}).bullBearScore
    // }));

    str({ onlyQuality: onlyQuality.map(t => omit(t, "yearHistoricals")) })
    const lowestThirtyFiveTo90Ratio = topQuarterBySort(
        onlyQuality,
        (a, b) => a.thirtyFiveTo90ratio - b.thirtyFiveTo90ratio
    ).map(t => t.ticker);
    const highestThirtyFiveTo90Ratio = topQuarterBySort(
        onlyQuality,
        (a, b) => b.thirtyFiveTo90ratio - a.thirtyFiveTo90ratio
    ).map(t => t.ticker);

    const logStats = (name, filter = () => true) => {
        // INNER PERMUTATIONS
        const filtered = onlyQuality.filter(filter);
        const sorts = {
            lowestfiveTo35ratio: (a, b) => a.fiveTo35ratio - b.fiveTo35ratio,
            highestfiveTo35ratio: (a, b) => b.fiveTo35ratio - a.fiveTo35ratio,
        };
        Object.keys(sorts).forEach(key => {
            const sorted = filtered.sort(sorts[key]);
            const sliced = sorted.slice(0, 10);
            console.log(`${name}-${key}`.toUpperCase());
            console.log(`count: ${sorted.length}`);
            response[`${name}-${key}`] = sliced.slice(0, 3).map(t => t.ticker);
            console.table(
                sliced.map(t => ({
                    ticker: t.ticker,
                    tso: t.trendSinceOpen,
                    tspc: t.trend_since_prev_close,
                    fiveTo35ratio: t.fiveTo35ratio,
                    thirtyFiveTo90ratio: t.thirtyFiveTo90ratio,
                    hit2down: t.hit2down,
                    ...t.hit2down ? {
                        ts2down: t.ts2down
                    } : {},
                    ...t.hit2up ? {
                        ts2up: t.ts2up
                    } : {},
                    stSent: t.stSent
                }))
            );
            const analyze = key => {
                const exists = sliced.filter(t => t[key]);
                const count = exists.length;
                const avg = avgArray(exists.map(t => t[key]));
                const returnAbs = avg * count;
                console.log(
                    `avg ${key}`,
                    avg,
                    'returnAbs',
                    returnAbs,
                    count
                );
            };
            ['trendSinceOpen', 'ts2down', 'ts2up'].forEach(analyze);
            console.log('\n');
        });
    };


    // OUTER PERMUTATIONS
    const filters = {
        overall: undefined,
        within5: b => b.percMax > -15,
        sma180trendingUp: b => b.sma180trendingUp,
        lowestThirtyFiveTo90Ratio: b => lowestThirtyFiveTo90Ratio.includes(b.ticker),
        highestThirtyFiveTo90Ratio: b => highestThirtyFiveTo90Ratio.includes(b.ticker),
    };
    const breakdowns = {
        ...filters,
        within5andSma180Up: b => filters.within5(b) && filters.sma180trendingUp(b),
        lowestThirtyFiveTo90RatioSma180Up: b => filters.lowestThirtyFiveTo90Ratio(b) && filters.sma180trendingUp(b),
        highestThirtyFiveTo90RatioSma180Up: b => filters.highestThirtyFiveTo90Ratio(b) && filters.sma180trendingUp(b),
        lowestThirtyFiveTo90RatioAndSma180UpAndWithin5: b => filters.lowestThirtyFiveTo90Ratio(b) && filters.sma180trendingUp(b) && filters.within5(b),
        highestThirtyFiveTo90RatioAndSma180UpAndWithin5: b => filters.highestThirtyFiveTo90Ratio(b) && filters.sma180trendingUp(b) && filters.within5(b),
    };
    Object.keys(breakdowns).forEach(key => {
        logStats(
            key,
            breakdowns[key]
        );
    });




    /// force ALPACA BUYS

    // const alpacaBuys = {    // not using values currently
    //     'highestThirtyFiveTo90Ratio-lowestfiveTo35ratio': -1,
    //     'overall-lowestfiveTo35ratio': 0,
    //     'lowestThirtyFiveTo90RatioSma180Up-highestfiveTo35ratio': 0
    // };

    // const perBuy = 100;
    // const getQuantity = price => Math.floor(perBuy/ price);
    // for (let key of Object.keys(alpacaBuys)) {
    //     log('buying', key);
    //     const buys = response[key];
    //     for (let ticker of buys) {
    //         const { askPrice } = await lookup(ticker);
    //         log({
    //             ticker,
    //             price: askPrice,
    //             quantity: getQuantity(askPrice)
    //         });
    //         alpacaLimitBuy(null, ticker, quantity, askPrice);
    //     }
    // }

    return response;

};

module.exports = {
    name: 'new-highs',
    trendFilter,
    run: [0, 90]
};