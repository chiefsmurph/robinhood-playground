const attemptSell = require('./attempt-sell');
const spraySell = require('./spray-sell');
const lookup = require('../utils/lookup');
const Holds = require('../models/Holds');
const sendEmail = require('../utils/send-email');
const getTrend = require('../utils/get-trend');
const alpacaCancelAllOrders = require('./cancel-all-orders');
const getMinFromOpen = require('../utils/get-minutes-from-open');
const Hold = require('../models/Holds');

const bothAttemptAndSpray = ({ ticker, quantity, numSeconds }) => {
    const halfQuantity = Math.floor(quantity / 2);
    const secondQuantity = quantity - halfQuantity;
    return Promise.all([
        attemptSell({ 
            ticker, 
            quantity: halfQuantity,
            // limitPrice: currentPrice * .995,
            // timeoutSeconds: 60,
            fallbackToMarket: true
         }),
         spraySell({
             ticker,
             quantity: secondQuantity,
             ...numSeconds && { numSeconds }
         })
    ]);
};

module.exports = async (position, numSeconds) => {

    let { 
        ticker, 
        quantity,
        percToSell,
        daysOld,
        mostRecentPurchase,
        wouldBeDayTrade,
        market_value
    } = position;

    if (market_value < 10) {
        percToSell = 100;
    }

    const sellQuantity = Math.ceil(quantity * (percToSell / 100));

    await alpacaCancelAllOrders(ticker, 'buy');
    
    // const { currentPrice } = await lookup(ticker);

    const method = getMinFromOpen() >= 0 ? 'attemptandspray' : 'attemptnofallback';
    await log(`selling ${ticker} via ${method}`, {
        ticker,
        beforeQuantity: quantity,
        percToSell,
        sellQuantity,
        daysOld,
        mostRecentPurchase,
        wouldBeDayTrade,
    });

    await Hold.updateOne({ ticker }, { isSelling: true });
    await log(`isSelling true ${ticker}`);
    const halfQuantity = Math.ceil(sellQuantity / 2);

    const response = getMinFromOpen() >= 0 && market_value > 30
        ? await bothAttemptAndSpray({   // reg hours
            ticker,
            quantity: sellQuantity,
            numSeconds
        })
        : await attemptSell({       // premarket
            ticker,
            quantity: sellQuantity,
            fallbackToMarket: false,
        });


    await log(`DONE SELLING ${ticker}`, {
        ticker,
        sellQuantity,
        method,
        response
    });


    setTimeout(async () => {
        await Hold.updateOne({ ticker }, { isSelling: false });
        await log(`sellPosition done - isSelling false ${ticker}`);
    }, 1000 * 60 * 5);
  
};