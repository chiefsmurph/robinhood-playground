const attemptSell = require('./attempt-sell');
const lookup = require('../utils/lookup');
const Holds = require('../models/Holds');
const sendEmail = require('../utils/send-email');
const getTrend = require('../utils/get-trend');

module.exports = async position => {

    const { 
        symbol: ticker, 
        qty: quantity 
    } = position;

    
    // const { currentPrice } = await lookup(ticker);

    const response = await attemptSell({ 
        ticker, 
        quantity,
        // limitPrice: currentPrice * .995,
        // timeoutSeconds: 60,
        // fallbackToMarket: true
     });

    const { alpacaOrder, attemptNum } = response || {};
    console.log(`sold ${ticker} in ${attemptNum} attempts!!!`)
    if (!alpacaOrder || !alpacaOrder.filled_at) {
        return sendEmail(`unable to sell ${ticker}`);
    }
    
  
};