const _ = require('underscore');

const { calcEMA, smaTrendingUp, addEMAs } = require('./indicators');

// utils
const getTrend = require('../utils/get-trend');

// app-actions
const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');
const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');

// npm
const mapLimit = require('promise-map-limit');

const trendFilter = async (trend) => {
    // add overnight jump
    console.log('adding overnight jump', trend)
    const withOvernightJump = await addOvernightJumpAndTSO(trend);
    console.log('done adding overnight jump')


    const top50Volume = withOvernightJump.sort((a, b) => {
        return b.fundamentals.volume - a.fundamentals.volume;
    }).slice(0, 200);


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

    const withEMA = addEMAs(trendWithDayHist);

    const startingBelow35Ema = withEMA.filter(o => 
        o.open.ema5 < o.open.ema35
    );

    console.log('starting', startingBelow35Ema.map(t => t.ticker))

    const withCrossedEma = startingBelow35Ema.map(o => {
        let crossedAt;
        const crossed = o.dayHistoricals.some(hist => {
            const new5dayEma = calcEMA(5, o, hist.close_price);
            const crossed = new5dayEma  > o.open.ema35;
            if (crossed) crossedAt = hist.close_price;
            return crossed;
        });
        return {
            ...o,
            crossed,
            crossedAt
        };
    });

    const withTrendFromCross = withCrossedEma
        .filter(o => o.crossed)
        .map(o => ({
            ...o,
            trendFromCross: getTrend(o.last_trade_price, o.crossedAt)
        }));

    str({ withTrendFromCross: withTrendFromCross.map(o => _.pick(o, ['ticker', 'sma180trendingUp', 'crossed', 'crossedAt', 'trendFromCross'])) });
    str(withTrendFromCross.length)

};

const emaCrossover = {
    name: 'ema-crossover',
    trendFilter,
    // run: [12, 190, 250, 600, -15],
};

module.exports = emaCrossover;
