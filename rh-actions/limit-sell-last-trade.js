const jsonMgr = require('../utils/json-mgr');
// const scrapeYahooPrice = require('../app-actions/scrape-yahoo-price');
const lookup = require('../utils/lookup');
const alreadyBoughtToday = require('./already-bought-today');

module.exports = async ({
    ticker,
    quantity = 1,
    bidPrice
}) => {
    console.log('limit selling', ticker);

    const {
        currentPrice,
        instrument
    } = (await lookup(ticker));
    bidPrice = bidPrice || currentPrice;

    bidPrice = +(Number(bidPrice).toFixed(2));

    var options = {
        type: 'limit',
        quantity: Math.round(quantity),
        bid_price: bidPrice,
        instrument: {
            url: instrument,
            symbol: ticker
        }
        // // Optional:
        // trigger: String, // Defaults to "gfd" (Good For Day)
        // time: String,    // Defaults to "immediate"
        // type: String     // Defaults to "market"
    };

    console.log(options);
    const res = await Robinhood.place_sell_order(options);
    // console.log('limit sell response', res);
    return res;
};
