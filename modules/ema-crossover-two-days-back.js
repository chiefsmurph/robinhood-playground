const _ = require('underscore');

// utils
const getTrend = require('../utils/get-trend');

// app-actions
const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');
const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');

// npm
const mapLimit = require('promise-map-limit');
const { SMA, EMA } = require('technicalindicators');


const trendFilter = async (trend) => {
    // add overnight jump
    console.log('adding overnight jump', trend)
    const withOvernightJump = await addOvernightJumpAndTSO(trend);
    console.log('done adding overnight jump')


    // const top50Volume = withOvernightJump.sort((a, b) => {
    //     return b.fundamentals.volume - a.fundamentals.volume;
    // }).slice(0, 200);


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

    
    const trendWithYearHist = await addTrendWithHistoricals(withOvernightJump, 'day', 'year');
    const trendWithDayHist = await addTrendWithHistoricals(trendWithYearHist, '5minute', 'day');

    const calcEMA = (period, obj, lastVal, daysBack) => {
        let hists = obj.yearHistoricals.map(hist => hist.close_price);
        if (daysBack) {
            hists = hists.slice(0, 0 - daysBack);
        }
        const array = EMA.calculate({
            period,
            values: [
                ...hists,
                ...lastVal ? [Number(lastVal)] : []
            ]
        });
        return array.pop();
    };
    const smaTrendingUp = (obj, lastVal) => {
        const array = SMA.calculate({
            period: 180,
            values: [
                ...obj.yearHistoricals.map(hist => hist.close_price),
                ...lastVal ? [Number(lastVal)] : []
            ]
        });
        const fiveDaysAgo = array[array.length - 6];
        const recent = array[array.length - 1];
        return recent > fiveDaysAgo;
    };
    const withEMA = trendWithDayHist.map(o => ({
        ...o,
        sma180trendingUp: smaTrendingUp(o, o.fundamentals.open),
        twoDaysBack: {
            ema35: calcEMA(35, o, null, 1),
            ema5: calcEMA(5, o, null, 1),
        },
        prevClose: {
            ema35: calcEMA(35, o),
            ema5: calcEMA(5, o),
        },
    }));
    // str({ withEMA})
    const crossedYesterday = withEMA.filter(o => {
        const twoDaysBelow = o.twoDaysBack.ema5 < o.twoDaysBack.ema35;
        const prevAbove = o.prevClose.ema5 > o.prevClose.ema35;
        return twoDaysBelow && prevAbove;
    });


    // str({ crossedYesterday: crossedYesterday.map(o => _.pick(o, ['ticker', 'sma180trendingUp', 'trend_since_prev_close'])) });
    return crossedYesterday.map(t => t.ticker);
};

const emaCrossover = {
    name: 'ema-crossover-two-days-back',
    trendFilter,
    run: [7, 103],
};

module.exports = emaCrossover;
