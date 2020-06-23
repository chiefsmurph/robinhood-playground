
const lookup = require('../utils/lookup');
const limitBuy = require('./limit-buy');
const marketBuy = require('./market-buy');

const ATTEMPT_TIMEOUTS = [30, 30, 30, 30, 30, 30, 30, 30, 30];     // seconds
const ATTEMPT_PERCS = [-1, -0.6, -0.34, 0, 0.3, 0.5, 1, 1.5, 2];  // percents
const MAX_ATTEMPTS = ATTEMPT_TIMEOUTS.length;

const { skipPurchasing } = require('../settings');

const { avgArray } = require('../utils/array-math');

const calcLimitPrice = async ({ ticker, pickPrice, attemptNum }) => {
    const attemptPercAbove = ATTEMPT_PERCS[attemptNum];

    const { bidPrice, askPrice, lastTrade } = await lookup(ticker);
    // const lowVal = Math.min(bidPrice, askPrice, lastTrade);
    const highVal = avgArray([bidPrice, lastTrade].filter(Boolean));// Math.max(bidPrice, askPrice, lastTrade);
    
    const aboveHigh = highVal * attemptPercAbove / 100;
    const maxPrice = Math.min(pickPrice * 1.042, bidPrice * 1.03);
    const finalPrice = Math.min(highVal + aboveHigh, maxPrice);
    strlog({
        bidPrice,
        askPrice,
        lastTrade,

        highVal,
        aboveHigh,

        attemptNum,
        attemptPercAbove,
        maxPrice,
        finalPrice
    })
    return finalPrice;
};

const alpacaAttemptBuy = async ({ ticker, quantity, pickPrice, strategy, fallbackToMarket }) => {

    if (skipPurchasing) {
        await log('skipping purchasing attempt buy');
        return;
    };

    // limit
    const attemptedPrices = [];
    for (let attemptNum of Array(MAX_ATTEMPTS).fill(0).map((v, i) => i)) {
        strlog({ attemptNum })
        const attemptPrice = await calcLimitPrice({ ticker, pickPrice, attemptNum });
        attemptedPrices.push(attemptPrice);
        strlog({
            attemptPrice
        })
        let attemptResponse = await limitBuy({
            ticker, 
            limitPrice: attemptPrice,
            quantity,
            timeoutSeconds: ATTEMPT_TIMEOUTS[attemptNum],
            fallbackToMarket: false
        }) || {};
        if (attemptResponse.filled_at) {
            return {
                alpacaOrder: attemptResponse,
                attemptNum,
                attemptedPrices
            };
        }
    }

    if (!fallbackToMarket) return console.log(`UNABLE TO ATTEMPT BUY ${ticker} and not falling back to market`)

    console.log('unable to limit buy, falling back to market buy', ticker);
    return {
        alpacaOrder: await marketBuy({ ticker, quantity }),
        attemptNum: 'market',
        attemptedPrices
    };

};

module.exports = alpacaAttemptBuy;