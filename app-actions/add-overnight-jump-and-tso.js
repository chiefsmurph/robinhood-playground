// utils
const getTrend = require('../utils/get-trend');
const chunkApi = require('../utils/chunk-api');
const addFundamentals = require('./add-fundamentals');

module.exports = async (trend) => {

    const trendWithFundamentals = trend && trend[0].fundamentals
        ? trend
        : await addFundamentals(trend);

    return trendWithFundamentals
        .map(stock => ({
            ...stock,
            trendSinceOpen: getTrend(stock.quote_data.lastTrade, stock.fundamentals.open),
            overnightJump: Number(stock.fundamentals.open)
                ? getTrend(stock.fundamentals.open, stock.quote_data.prevClose)
                : getTrend(stock.last_trade_price, stock.quote_data.prevClose)
        }))
        .filter(a => a.fundamentals.open);

};
