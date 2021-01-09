const Pick = require('../models/Pick');
const { groupBy, mapObject } = require('underscore');
const runScan = require('../scans/base/run-scan');

module.exports = async (limit = 30, search = '') => {
    const picks = await Pick.getRecentRecommendations(limit);
    const byTicker = groupBy(picks, pick => pick.picks[0].ticker);
    const scan = await runScan({
        tickers: Object.keys(byTicker)
    });
    const aggregated = mapObject(byTicker, (picks, ticker) => {
        const pickPrices = picks.map(pick => 
            pick.picks.find(p => p.ticker === ticker).price
        );
        return {
            pickPrices,
            interestingWords: [...new Set(...picks.map(pick => pick.interestingWords))],
            mostRecentTimestamp: picks[picks.length - 1].timestamp,
            scan: scan.find(s => s.ticker === ticker)
        };
    });
    return aggregated;
};