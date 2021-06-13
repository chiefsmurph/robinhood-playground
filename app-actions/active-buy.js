// starts attempting to buy at 100% of current stock price
// every attempt it goes up from there until it successfully gets sold or it reaches MAX_BUY_RATIO

const howMuchBoughtToday = require('./how-much-bought-today');
const limitBuyLastTrade = require('../rh-actions/limit-buy-last-trade');
const jsonMgr = require('../utils/json-mgr');

const lookup = require('../utils/lookup');
const mapLimit = require('promise-map-limit');

const MAX_BUY_PER_STOCK = 360;
const TIME_BETWEEN_CHECK = 6; // seconds
const TOTAL_ATTEMPTS = 20;
const PERC_ALLOWED_ABOVE_PICK_PRICE = 4;

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

const preOrPostMarketBuy = async ({
    ticker,
    strategy,
    maxPrice,
}) => {
    const { afterHoursPrice } = await lookup(ticker);
    const bidPrice = afterHoursPrice;
    const quantity = calcQuantity(maxPrice, bidPrice);
    const data = {
        ticker,
        bidPrice,
        quantity,
        strategy
    };
    console.log('pre or post market buy', data, maxPrice);
    return limitBuyLastTrade(data);
};

module.exports = async (
        {
        ticker,
        strategy,   // strategy name
        maxPrice,   // total amount to spend
        min,
        pickPrice
    }
) => {

    const boughtToday = await howMuchBoughtToday(ticker) || 0;
    const remaining = MAX_BUY_PER_STOCK - boughtToday;
    maxPrice = Math.min(maxPrice, remaining);

    if (maxPrice < 15) {
        throw 'hit max price for ticker';
    }

    if ((min < 0 || min > 390) && min != 5000) {
        return preOrPostMarketBuy({
            ticker,
            strategy,
            maxPrice,
        });
    }

    return new Promise(async (resolve, reject) => {


        try {

            let attemptCount = 0;

            // maxPrice = Math.min(maxPrice, 35);


            const attempt = async () => {

                attemptCount++;
                console.log('active-buy attempting ', attemptCount, ticker);


                // if (!quantity) {
                //     console.log('maxPrice below bidPrice but ', maxPrice, bidPrice, ticker);
                //     return reject('maxPrice below bidPrice');
                // }
                let lastBidPrice;
                let quantity;
                const limitBid = async (bidPrice, q) => {
                    const finalBidPrice = pickPrice ? Math.min(pickPrice * (PERC_ALLOWED_ABOVE_PICK_PRICE / 100 + 1), bidPrice) : bidPrice;
                    lastBidPrice = finalBidPrice;
                    quantity = q || calcQuantity(maxPrice, finalBidPrice);
                    console.log({ bidPrice, finalBidPrice });
                    const data = {
                        ticker,
                        bidPrice: finalBidPrice,
                        quantity,
                        strategy
                    };
                    console.log({ data, maxPrice });
                    return limitBuyLastTrade(
                                                data
                    );

                };

                const attemptLimitOrder = async () => {
                    const { askPrice, bidPrice, lastTrade } = await lookup(ticker);
                    const allPrices = askPrice 
                        ? [
                            askPrice, 
                            // bidPrice,
                            lastTrade
                        ]
                        : [lastTrade, lastTrade * 1.05];    // if askPrice is not set use lastTrade * 1.05 as upper limit
                    const upperTarget = Math.max(...allPrices) * 1.2;
                    const lowerTarget = Math.min(...allPrices) * 1.011;
                    const spread = upperTarget - lowerTarget;
                    const aboveBid = spread * (attemptCount - 1) / (TOTAL_ATTEMPTS - 1);
                    const attemptPrice = lowerTarget + aboveBid;
                    console.log({
                        askPrice,
                        bidPrice,
                        lastTrade,
                        spread,
                        aboveBid,
                        attemptPrice,
                        attemptCount
                    })
                    return limitBid(attemptPrice);
                };

                const fakeMarketOrder = async () => {
                    const { askPrice } = await lookup(ticker);
                    const attemptPrice = askPrice;
                    console.log('fake market order for', ticker, {
                        askPrice,
                        attemptPrice
                    });
                    return limitBid(attemptPrice, 1);
                };

                let res = await attemptLimitOrder();

                str({ res })

                if (!res || res.detail) {
                    const onlyShares = res.detail.match(/You can only purchase (\d*) shares/);
                    if (onlyShares) {
                        const recShares = onlyShares[1];
                        console.log('found only shares error message', lastBidPrice, recShares);
                        return limitBid(lastBidPrice, Number(recShares));
                    }
                    return reject(res.detail || 'unable to purchase' + ticker);
                }

                if (res && res.non_field_errors && res.non_field_errors.length && res.non_field_errors[0].includes('increments of $0.05')) {
                    const nearestFiveCents = num => {
                        return Math.ceil(num * 20) / 20;
                    };
                    const newBid = nearestFiveCents(lastBidPrice);
                    console.log('5 center!!!');
                    console.log('new bid', newBid);
                    res = await limitBid(newBid);
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
                    if (attemptCount < TOTAL_ATTEMPTS) {
                        await Robinhood.cancel_order(res);
                        return attempt();
                    } else {
                        const errMessage = 'reached max attempts, unable to BUY though leaving fakeMarketOrder though';
                        console.log(errMessage, ticker);
                        await fakeMarketOrder();
                        return reject(errMessage);
                    }
                } else {

                    // update daily transactions
                    const successObj = {
                        type: 'buy',
                        ticker,
                        bid_price: lastBidPrice,
                        quantity,
                        strategy,
                        min
                    };
                    await addToDailyTransactions(successObj);

                    if (attemptCount) {
                        console.log('successfully bought with attemptcount', attemptCount, ticker);
                    }

                    return resolve(successObj);

                }

            };

            attempt();

        } catch (e) {
            return reject(e.toString());
        }

    });


};
