const howMuchBoughtToday = require('./how-much-bought-today');
const limitBuyLastTrade = require('../rh-actions/limit-buy-last-trade');
const jsonMgr = require('../utils/json-mgr');
const lookup = require('../utils/lookup');

const PERC_ALLOWED_ABOVE_PICK_PRICE = 7;
const MINUTES_BEFORE_CANCEL = 10;
const MAX_BUY_PER_STOCK = 360;

const addToDailyTransactions = async data => {
    const fileName = `./json/daily-transactions/${(new Date()).toLocaleDateString().split('/').join('-')}.json`;
    const curTransactions = await jsonMgr.get(fileName) || [];
    curTransactions.push(data);
    await jsonMgr.save(fileName, curTransactions);
};

const calcQuantity = (maxPrice, bidPrice) => {
    let quantity = Math.floor(maxPrice / bidPrice);
    if (quantity === 0 && bidPrice < 50) {
        quantity = 1;
    }
    return quantity;
};

module.exports = async ({
    ticker,
    strategy,   // strategy name
    maxPrice,   // total amount to spend
    min,
    pickPrice
}) => {

    const boughtToday = await howMuchBoughtToday(ticker) || 0;
    const remaining = MAX_BUY_PER_STOCK - boughtToday;
    maxPrice = Math.min(maxPrice, remaining);

    if (maxPrice < 15) {
        throw 'hit max price for ticker';
    }

    const l = await lookup(ticker);
    let bidPrice = l.askPrice;
    const highestAllowed = pickPrice * (PERC_ALLOWED_ABOVE_PICK_PRICE / 100 + 1);
    if (pickPrice && bidPrice > highestAllowed){
        console.log('bidPrice above highestAllowed', ticker, { bidPrice, pickPrice });
        bidPrice = Math.min(highestAllowed, bidPrice);
    }
    

    // const quantity = calcQuantity(maxPrice, bidPrice);
    str({
        // quantity,
        bidPrice,
        maxPrice
    })
    const purchase = await limitBuyLastTrade(
                {
            ticker,
            bidPrice,
            maxPrice
        }
    );

    const timeout = 1000 * 60 * MINUTES_BEFORE_CANCEL;
    await new Promise(resolve => setTimeout(resolve, timeout));

    // check state of order
    const { state } = await Robinhood.url(purchase.url);
    const filled = state === 'filled';
    str({ filled });

    if (filled) {
        // update daily transactions
        const successObj = {
            type: 'buy',
            ticker,
            bid_price: bidPrice,
            quantity,
            strategy,
            min
        };
        await addToDailyTransactions(successObj);
    } else {
        console.log('failed purchasing', {
            ticker,
            strategy,   // strategy name
            maxPrice,   // total amount to spend
            min,
            pickPrice
        });
    }
};