const { force: { keep: keepers } } = require('../settings');

const howMuchBoughtToday = require('./how-much-bought-today');
const limitSellLastTrade = require('../rh-actions/limit-sell-last-trade');
const alreadyBoughtToday = require('../rh-actions/already-bought-today');

const jsonMgr = require('../utils/json-mgr');
const lookup = require('../utils/lookup');

const MINUTES_BEFORE_CANCEL = 30;

const addToDailyTransactions = async data => {
    const fileName = `./json/daily-transactions/${(new Date()).toLocaleDateString().split('/').join('-')}.json`;
    const curTransactions = await jsonMgr.get(fileName) || [];
    curTransactions.push(data);
    await jsonMgr.save(fileName, curTransactions);
};

module.exports = async ({ 
    ticker, 
    quantity 
}) => {

    if (keepers.includes(ticker)) {
        throw 'ticker on keeper list: ' + ticker;
    }

    const boughtToday = await howMuchBoughtToday(ticker) || 0;
    if (boughtToday > 0) {
        throw 'already bought today: ' + ticker;
    }

    if (await alreadyBoughtToday(ticker)) {
        throw 'not selling ' + ticker + 'because bought today';
    }

    let { lastTrade, bidPrice: b } = await lookup(ticker);
    bidPrice = Math.max(lastTrade * 0.95, b);
    str({ ticker, lastTrade, bidPrice, b })
    const purchase = await limitSellLastTrade(
                {
            ticker,
            bidPrice,
            quantity,
        }
    );

    const timeout = 1000 * 60 * MINUTES_BEFORE_CANCEL;
    await new Promise(resolve => setTimeout(resolve, timeout));

    // check state of order
    const { state } = await Robinhood.url(purchase.url);
    const filled = state === 'filled';
    str({ ticker, filled });
    const data = {
        type: 'sell',
        ticker,
        bidPrice,
        quantity
    };
    if (filled) {
        // update daily transactions
        await addToDailyTransactions(data);
    } else {
        console.log('failed selling', data);
    }
};