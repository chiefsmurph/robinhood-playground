// watchout if stock has flutuated more than 15% in 24 hours in the last 3 months

const getTrend = require('../utils/get-trend');
const { avgArray } = require('../utils/array-math');
const lookup = require('../utils/lookup');
const cacheThis = require('../utils/cache-this');

const getRisk = async ({
    ticker, 
    yearHistoricals,
    quote_data
} = {}) => {

    // console.log('evaluating risk ...', ticker);
    
    let dailyYear = yearHistoricals ? yearHistoricals : await (async () => {
        const historicalDailyUrl = `https://api.robinhood.com/quotes/historicals/${ticker}/?interval=day`;
        let response = await Robinhood.url(historicalDailyUrl);
        return response.historicals;
    })();

    if (!dailyYear) {
        console.log('cant find', ticker)
        return {};
    }

    if (!dailyYear.length) {
        return { shouldWatchout: true };
    }

    let maxClose = 0;
    const overnightJumps = [];
    dailyYear = dailyYear
        .map((historical, ind) => {
            const prevDay = dailyYear[ind - 1] || {};
            const trend = getTrend(historical.close_price, prevDay.close_price);
            if (trend < -3) {
                const jumpOvernight = Number(prevDay.close_price) - Number(historical.open_price);
                jumpOvernight && overnightJumps.push(jumpOvernight);
            }
            if (Number(historical.close_price) > maxClose) maxClose = Number(historical.close_price);
            return {
                ...historical,
                trend
            };
        });
    
    // str({ dailyYear})

    const downJumpped = dailyYear.some(historical => historical.trend < -15);
    const last4 = dailyYear.slice(-6);
    const lastDay = last4.pop();
    const last4Low = Math.min(...last4.map(obj => obj.low_price));
    const lastDayMax = lastDay.high_price;

    const last4Volatility = getTrend(last4Low, lastDayMax);
    const last4TooVolatile = last4Volatility < -19;    
    // str({ last4, last4Low, lastDayMax, last4Volatility, last4TooVolatile });
    const last4UpJumpped = last4.some(historical => historical.trend > 25);
    const l = quote_data || await lookup(ticker);
    const dayVolatility = Math.abs(
        getTrend(l.rawQuote.last_trade_price, l.rawQuote.adjusted_previous_close)
    );
    const dayTooVolatile = dayVolatility > 35;

    console.log(ticker, {
        downJumpped,
        last4UpJumpped,
        dayVolatility,
        dayTooVolatile
    });
    const shouldWatchout = last4UpJumpped || dayTooVolatile || last4TooVolatile;

    return {
        shouldWatchout,
        avgJumpAfterDrop: +(avgArray(overnightJumps).toFixed(2)),
        percMax: getTrend(dailyYear[dailyYear.length - 1].close_price, maxClose),
        sumMostRecent: dailyYear.slice(-3).map(hist => hist.trend).reduce((acc, val) => acc + val, 0)
    };
    // console.log(JSON.stringify(dailyYear, null, 2));
};

module.exports = cacheThis(
    getRisk, 
    60 * 3  // 3 hours
);
