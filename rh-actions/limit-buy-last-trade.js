const jsonMgr = require('../utils/json-mgr');
// const { avgArray } = require('../utils/array-math');

// const scrapeYahooPrice = require('../app-actions/scrape-yahoo-price');
const lookup = require('../utils/lookup');

const alreadySoldThisStockToday = async ticker => {
    const fileName = `./json/daily-transactions/${(new Date()).toLocaleDateString().split('/').join('-')}.json`;
    const curTransactions = await jsonMgr.get(fileName) || [];
    return curTransactions.some(transaction => {
        return transaction.ticker === ticker && transaction.type === 'sell';
    });
};

const limitBuyLastTrade = async ({ ticker, maxPrice, quantity, bidPrice }) => {

    try {

        if (await alreadySoldThisStockToday(ticker)) {
            const errMessage = 'not purchasing ' + ticker + 'because already sold today';
            console.log(errMessage);
            return { detail: errMessage };
        }

        console.log('limit buying', ticker);



        // const quoteData = await Robinhood.quote_data(ticker);

        //
        // const impNums = [
        //     askPrice,
        //     lastTrade
        // ].map(val => Number(val)).filter(val => val > 0);
        //
        // let bidPrice = avgArray(impNums);
        const {
            currentPrice,
            instrument
        } = (await lookup(ticker));
        bidPrice = bidPrice || currentPrice;

        bidPrice = +(Number(bidPrice).toFixed(2));

        if (!quantity) {
            quantity = Math.floor(maxPrice / bidPrice);
        }
        console.log('bidPrice', bidPrice);
        console.log('maxPrice', maxPrice);
        console.log('quanity', quantity);

        if (!quantity || !bidPrice) return;

        var options = {
            type: 'limit',
            quantity,
            bid_price: bidPrice,
            instrument: {
                url: instrument,
                symbol: ticker
            },
            // // Optional:
            // trigger: 'immediate', // Defaults to "gfd" (Good For Day)
            // time: 'gfd',    // Defaults to "immediate"
            // type: String     // Defaults to "market"
            extended_hours: true
        };
        const res = await Robinhood.place_buy_order(options);
        console.log('limit buy response', res);
        return res;

    } catch (e) {
        return { detail: e.toString() };
    }

};

module.exports = limitBuyLastTrade;
