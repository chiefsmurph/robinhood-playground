const { pick, mapObject } = require('underscore');
const getTrend = require('../../utils/get-trend');




// app-actions
const addOvernightJumpAndTSO = require('../../app-actions/add-overnight-jump-and-tso');




// helpers

function clamp(val, min, max) {
    return val > max ? max : val < min ? min : val;
}

const prefixKeys = (obj, prefix) => Object.keys(obj).reduce((acc, key) => ({
    ...acc,
    [prefix + key]: obj[key]
}), {});





const dayPerms = [
    365,
    100,
    90,
    60,
    30,
    20,
    15,
    10,
    7,
    5,
];

const sortByPerms = [
    'percUp',
    'lightTrendScore',
    'heavyTrendScore',
    'inverseLightTrendScore',
    'inverseHeavyTrendScore',
    'periodTrendVolatilityScore'
];

let outerPerms = {
    '': () => true,
    onjn1to1: ({ overnightJump }) => overnightJump > -1 && overnightJump < 1,
    onjn1to1AndTSOn1to1: ({ overnightJump, trendSinceOpen }) => overnightJump > -1 && overnightJump < 1 && trendSinceOpen > -1 && trendSinceOpen < 1,
    onj1to4AndTSOn5ton1: ({ overnightJump, trendSinceOpen }) => overnightJump > 1 && overnightJump < 4 && trendSinceOpen > -5 && trendSinceOpen < -1,
    onjn6ton1AndTSO1to3: ({ overnightJump, trendSinceOpen }) => overnightJump > -6 && overnightJump < -1 && trendSinceOpen > 1 && trendSinceOpen < 3,
    yesterdayDown: ({ yearHistoricals }) => yearHistoricals[yearHistoricals.length - 1].close_price < yearHistoricals[yearHistoricals.length - 2].close_price,
    yesterdayDown10to3: ({ yearHistoricals }) => {
        const trend = getTrend(yearHistoricals[yearHistoricals.length - 1].close_price, yearHistoricals[yearHistoricals.length - 2].close_price);
        return trend > -10 && trend < -3;
    }
};









const getSliceForDayCount = (dayCount, trend) => {

    let results = {};

    const copy = [...trend];
    const slicedHistoricals = copy.map(buy => ({
        ...buy,
        yearHistoricals: buy.yearHistoricals.slice(0 - dayCount)
    }));

    let analyzed = slicedHistoricals
        .map(buy => ({
            ...buy,
            percUp: buy.yearHistoricals.filter(hist => hist.trend > 0).length / buy.yearHistoricals.length,
            periodTrend: getTrend(
                buy.yearHistoricals[buy.yearHistoricals.length - 1].close_price,
                (buy.yearHistoricals.find(hist => hist.open_price) || {}).open_price
            )
        }))
        .map(buy => ({
            ...buy,
            avgDailyTrend: buy.periodTrend / buy.yearHistoricals.length,
        }))
        .map(buy => ({
            ...buy,
            dayCount: buy.yearHistoricals.length,
            yearHistoricals: buy.yearHistoricals
                .map((hist, index) => ({
                    ...pick(hist, ['begins_at', 'close_price', 'distance']),
                    distance: getTrend(
                        hist.close_price,
                        (buy.yearHistoricals[index - 1] || {}).close_price
                    ) - buy.avgDailyTrend
                }))
                .filter(hist => Boolean(hist.distance))
        }))
        .map(buy => ({
            ...buy,
            volatility: buy.yearHistoricals.reduce((acc, { distance }) => acc + Math.abs(distance), 0)
        }))
        .map(buy => ({
            ...buy,
            periodTrendVolatilityScore: buy.periodTrend / buy.volatility,
            lightTrendScore:  buy.percUp + buy.periodTrend / 1000,
            heavyTrendScore:  buy.percUp + buy.periodTrend / 100,
            inverseLightTrendScore:  buy.percUp - buy.periodTrend / 1000,
            inverseHeavyTrendScore:  buy.percUp - buy.periodTrend / 100
        }))
        .filter(buy => buy.avgDailyTrend > 0.8 && buy.volatility);


    const fifthCount = clamp(Math.round(analyzed.length / 5), 15, 60);
    // console.log({ fifthCount })

    sortByPerms.forEach(key => {
        const sorted = analyzed.sort((a, b) => b[key] - a[key]);
        const resultKey = [dayCount, key].join('-');
        const singlePick = sortFn => sorted
            .slice(0, fifthCount)
            .sort(sortFn)
            .slice(0, 1);
        const getTicks = picks => picks.map(buy => buy.symbol);
        results = {
            ...results,
            ...mapObject({
                [resultKey]: sorted.slice(0, 3),
                [`${resultKey}-volatilityPick`]: singlePick(
                    (a, b) => a.volatility - b.volatility
                ),
                [`${resultKey}-periodTrendVolatilityPick`]: singlePick(
                    (a, b) => b.periodTrendVolatilityScore - a.periodTrendVolatilityScore
                ),
            }, getTicks)
        };

    });


    return results;
};
















const strategy = async (trendWithHistoricals, daysBack, outerPermsLimit) => {

    if (outerPermsLimit) {
        outerPerms = outerPermsLimit.reduce((acc, key) => ({
            ...acc,
            [key]: outerPerms[key]
        }), {});
    }

    if (daysBack) {
        trendWithHistoricals = trendWithHistoricals.map(buy => ({
            ...buy,
            yearHistoricals: buy.yearHistoricals.slice(0, 0 - daysBack)
        }));
    }


    trendWithHistoricals = await addOvernightJumpAndTSO(trendWithHistoricals);


    const hists = trendWithHistoricals[0].yearHistoricals ;
    console.log(
        {
            daysBack,
            lastDate: hists[hists.length - 1].begins_at
        }
    );



    let results = {};





    
    
    Object.keys(outerPerms).forEach(outerPermKey => {
        const outerPermFilter = outerPerms[outerPermKey];
        const filteredTrend = trendWithHistoricals.filter(outerPermFilter);
        console.log(outerPermKey, filteredTrend.length);

        let innerResults = {};
        dayPerms.forEach(dayCount => {
            innerResults = {
                ...innerResults,
                ...getSliceForDayCount(dayCount, filteredTrend)
            };
        });

        results = {
            ...results,
            ...outerPermKey ? prefixKeys(innerResults, outerPermKey + '-') : innerResults
        };
    });
    
    
    return results;
};


export default strategy;