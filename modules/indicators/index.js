// must have yearHistoricals & fundamentals set
const { SMA, EMA } = require('technicalindicators');
const getTrend = require('../../utils/get-trend');

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
const calcEMAtrend = (period, obj, lastVal) => {
    const array = EMA.calculate({
        period,
        values: [
            ...obj.yearHistoricals.map(hist => hist.close_price),
            ...lastVal ? [Number(lastVal)] : []
        ]
    });
    const atPeriod = array[array.length - period];
    const last = array[array.length - 1];
    return getTrend(last, atPeriod);
};
const addEMAs = trend => trend.map(o => ({
    ...o,
    sma180trendingUp: smaTrendingUp(o, o.fundamentals.open),
    open: {
        ema90: calcEMA(90, o, o.fundamentals.open),
        ema35: calcEMA(35, o, o.fundamentals.open),
        ema5: calcEMA(5, o, o.fundamentals.open),
        ema3trend: calcEMAtrend(3, o, o.fundamentals.open),
        ema5trend: calcEMAtrend(5, o, o.fundamentals.open),
        ema35trend: calcEMAtrend(35, o, o.fundamentals.open),
        ema90trend: calcEMAtrend(90, o, o.fundamentals.open),
        fiveTrend: getTrend(
            o.fundamentals.open,
            o.yearHistoricals[o.yearHistoricals.length - 5].close_price
        ),
    },
}));

module.exports = { calcEMA, smaTrendingUp, addEMAs };