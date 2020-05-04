const getStSent = require('../utils/get-stocktwits-sentiment');
const lookup = require('../utils/lookup');
const getTrend = require('../utils/get-trend');
module.exports = async (
    ticker, 
    avgBuyPrice,
    bullishLimits = [8, -8],
    neutralLimits = [8, -8],
    bearishLimits = [5, -5],
) => {
    ticker = ticker.toUpperCase();
    pricePaid = Number(avgBuyPrice);

    console.log(ticker, pricePaid )

    const [stSent, l] = await Promise.all([
        getStSent(ticker),
        lookup(ticker)
    ]);
    const trend = getTrend(l.currentPrice, avgBuyPrice);
    const dayTrend = getTrend(l.currentPrice, l.prevClose);

    console.log({ trend, l, dayTrend });

    const stSentBullish = (stSent || {}).bullBearScore > 50;
    str({ stSentBullish, stSent });

    const {
        upperLimit,
        lowerLimit
    } = stSent;
    const hitDayTrendLimit = dayTrend > upperLimit;
    return trend > upperLimit || trend < lowerLimit || hitDayTrendLimit;
}