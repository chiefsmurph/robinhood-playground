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


    const top50Volume = withOvernightJump.sort((a, b) => {
        return b.fundamentals.volume - a.fundamentals.volume;
    });


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

    
    const trendWithYearHist = await addTrendWithHistoricals(top50Volume, 'day', 'year');
    const trendWithDayHist = await addTrendWithHistoricals(trendWithYearHist, '5minute', 'day');

    const calcEMA = (period, obj, lastVal) => {
        const array = EMA.calculate({
            period,
            values: [
                ...obj.yearHistoricals.map(hist => hist.close_price),
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
        prevClose: {
            ema35: calcEMA(35, o),
            ema5: calcEMA(5, o),
        },
        current: {
            ema35: calcEMA(35, o, o.last_trade_price),
            ema5: calcEMA(5, o, o.last_trade_price),
        },
    }));

    const crossedToday = withEMA.filter(o => {
        const yesterdayBelow = o.prevClose.ema5 < o.prevClose.ema35;
        const nowAbove = o.current.ema5 > o.current.ema35;
        return yesterdayBelow && nowAbove;
    });

    str({ crossedToday: crossedToday.map(o => _.pick(o, ['ticker', 'sma180trendingUp', 'trendFromCross'])) });
    
    const ticks = arr => arr.map(t => t.ticker);
    const sma180trendingUp = ticks(crossedToday.filter(t => t.sma180trendingUp));
    const allOthers = ticks(crossedToday.filter(t => !t.sma180trendingUp));
    return {
        sma180trendingUp,
        allOthers
    };

};

const emaCrossover = {
    name: 'ema-crossover-last-trade',
    trendFilter,
    run: [24, 100, 200, 330, 360, 380],
};

module.exports = emaCrossover;
