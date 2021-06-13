const getTrendSinceOpen = require('../rh-actions/get-trend-since-open');
const jsonMgr = require('../utils/json-mgr');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');

const getAllTickers = require('../rh-actions/get-all-tickers');
const { isTradeable } = require('../utils/filter-by-tradeable.js');
const blacklist = require('../blacklist');

const getTrendAndSave = async (min) => {

    min = min || getMinutesFromOpen();

    // step 1 - get all tickers
    try {
        var allTickers = require('../json/stock-data/allStocks');
    } catch (e) {
        allTickers = await getAllTickers();
    }
    allTickers = allTickers
        .filter(isTradeable)
        .map(stock => stock.symbol);

    // step 2 - get trend
    console.log(`getting trend since open for all stocks - 6:31am + ${min} minutes`);
    let trendingArray = await getTrendSinceOpen(allTickers);
    trendingArray = trendingArray.filter(o => !blacklist.includes(o.ticker));
    const dateStr = (new Date()).toLocaleString().split('/').join('-').split(',').join('');

    // step 3 - save trend
    await jsonMgr.save(`./json/stock-data/${dateStr} (+${min}).json`, trendingArray);
    console.log('done getting trend');

    return trendingArray;

};

module.exports = getTrendAndSave;
