const attemptSell = require('./attempt-sell');
const spraySell = require('./spray-sell');
const lookup = require('../utils/lookup');
const Holds = require('../models/Holds');
const sendEmail = require('../utils/send-email');
const getTrend = require('../utils/get-trend');
const alpacaCancelAllOrders = require('./cancel-all-orders');
const getMinFromOpen = require('../utils/get-minutes-from-open');


const bothAttemptAndSpray = ({ ticker, quantity }) => {
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
             quantity: secondQuantity
         })
    ]);
};

module.exports = async position => {

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
    const halfQuantity = Math.ceil(sellQuantity / 2);

    const response = getMinFromOpen() >= 0 && market_value > 30
        ? await bothAttemptAndSpray({   // reg hours
            ticker,
            quantity: sellQuantity
        })
        : await attemptSell({       // premarket
            ticker,
            quantity: sellQuantity,
            fallbackToMarket: false     
        });


    await log(`SOLD POSITION ${ticker}`, {
        ticker,
        sellQuantity,
        method,
        response
    })
    
  
};