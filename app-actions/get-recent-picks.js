const Pick = require('../models/Pick');
const { groupBy, mapObject } = require('underscore');
const runScan = require('../scans/base/run-scan');
const lookupMultiple = require('../utils/lookup-multiple');
const { avgArray } = require('../utils/array-math');
const getTrend = require('../utils/get-trend');

const roundTo = numDec => num => Math.round(num * Math.pow(10, numDec)) / Math.pow(10, numDec);
const twoDec = roundTo(2);

module.exports = async (limit = 30, isRecommended = true, includeStSent = false, strategyName) => {
    console.log('app action get recent', limit, strategyName);
    const picks = await Pick.getRecentRecommendations(limit, isRecommended, strategyName);
    const byTicker = groupBy(picks, pick => pick.picks[0].ticker);
    const prices = await lookupMultiple(Object.keys(byTicker));
    const validTickers = Object.keys(prices);
    const scan = await runScan({
        tickers: validTickers,
        includeStSent
    });
    return validTickers.map(ticker => {
        const picks = byTicker[ticker];
        const pickPrices = picks.map(pick =>
            pick.picks.find(p => p.ticker === ticker).price
        );
        const avgPrice = twoDec(avgArray(pickPrices));
        const nowPrice = prices[ticker];
        return {
            ticker,
            pickPrices,
            avgPrice,
            nowPrice,
            trend: getTrend(nowPrice, avgPrice),
            interestingWords: [...new Set(...picks.map(pick => pick.interestingWords))],
            mostRecentTimestamp: picks[0].timestamp,
            scan: scan.find(s => s.ticker === ticker)
        };
    });
};