// starts attempting to sell at 100% of current stock price
// every attempt it goes down from there until it successfully gets sold or it reaches MIN_SELL_RATIO

const { force: { keep: keepers } } = require('../settings');

const limitSellLastTrade = require('../rh-actions/limit-sell-last-trade');
const jsonMgr = require('../utils/json-mgr');

const lookup = require('../utils/lookup');
const mapLimit = require('promise-map-limit');


const MIN_SELL_RATIO = 0.95; // before gives up
const TIME_BETWEEN_CHECK = 5; // seconds
const SELL_RATIO_INCREMENT = 0.004;


const addToDailyTransactions = async data => {
    const fileName = `./json/daily-transactions/${(new Date()).toLocaleDateString().split('/').join('-')}.json`;
    const curTransactions = await jsonMgr.get(fileName) || [];
    curTransactions.push(data);
    await jsonMgr.save(fileName, curTransactions);
};


module.exports = ({ ticker, quantity }) => {

    return new Promise(async (resolve, reject) => {

        console.log('active-sell', ticker, quantity);

        try {
            if (keepers.includes(ticker)) {
                console.log('ticker on keeper list', ticker);
                return reject('ticker on keeper list');
            }

            let curSellRatio = 1.00;
            let attemptCount = 0;

            const attempt = async () => {

                attemptCount++;

                console.log('attempt')
                const look = (await lookup(ticker));
                const curPrice = look.currentPrice;
                const bidPrice = curPrice * curSellRatio;
                console.log('attempting ', curSellRatio, ticker, quantity, bidPrice);
                const res = await limitSellLastTrade(
                    {
                        ticker,
                        quantity,
                        bidPrice
                    }
                );

                if (res.detail)  {
                    // dont log transaction if failed
                    console.log('failed selling', ticker);
                    return reject(res.detail);
                }

                const timeout = ((0.8 * TIME_BETWEEN_CHECK) + (Math.random() * TIME_BETWEEN_CHECK * 0.8)) * 1000;
                await new Promise(resolve => setTimeout(resolve, timeout));
                
                // check state of order
                const { state } = await Robinhood.url(res.url);
                const filled = state === 'filled';
                str({ filled });
                // console.log(relOrder);
                if (!filled) {
                    console.log('canceling last attempt', ticker);
                    console.log('cancel', await Robinhood.cancel_order(res));
                    str({ res })
                    await Robinhood.url(res.cancel);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    curSellRatio -= SELL_RATIO_INCREMENT;
                    if (curSellRatio > MIN_SELL_RATIO) {
                        return attempt();
                    } else {
                        const errMessage = 'reached MIN_SELL_RATIO, unable to sell';
                        console.log(errMessage, ticker);
                        return reject(errMessage);
                    }
                } else {

                    const successObj = {
                        type: 'sell',
                        ticker,
                        bid_price: bidPrice,
                        quantity
                    };
                    await addToDailyTransactions(successObj);

                    if (attemptCount) {
                        console.log('successfully sold with attemptcount', attemptCount, ticker);
                    }

                    return resolve(successObj);

                }

            };

            attempt();

        } catch (e) {
            console.log(e);
            reject(e.toString());
        }


    });

};
