const attemptSell = require('./attempt-sell');
const lookup = require('../utils/lookup');
const Holds = require('../models/Holds');
const sendEmail = require('../utils/send-email');
const getTrend = require('../utils/get-trend');
const alpacaCancelAllOrders = require('./cancel-all-orders');

module.exports = async position => {

    const { 
        ticker, 
        quantity,
        percToSell,
        daysOld,
        mostRecentPurchase,
        wouldBeDayTrade
    } = position;

    const sellQuantity = Math.ceil(quantity * (percToSell / 100));

    await alpacaCancelAllOrders(ticker, 'buy');
    
    // const { currentPrice } = await lookup(ticker);

    await log(`selling ${ticker}`, {
        ticker,
        beforeQuantity: quantity,
        percToSell,
        sellQuantity,
        daysOld,
        mostRecentPurchase,
        wouldBeDayTrade,
    });

    const response = await attemptSell({ 
        ticker, 
        quantity: sellQuantity,
        // limitPrice: currentPrice * .995,
        // timeoutSeconds: 60,
        fallbackToMarket: true
     });

    const { alpacaOrder, attemptNum } = response || {};
    console.log(`sold ${ticker} in ${attemptNum} attempts!!!`)
    if (!alpacaOrder || !alpacaOrder.filled_avg_price) {
        return sendEmail(`unable to sell ${ticker}`);
    }
    
  
};