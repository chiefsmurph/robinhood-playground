
// const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const { alpaca } = require('.');
const marketSell = require('./market-sell');


const limitSell = async ({
    ticker = 'IMBI', 
    quantity = 446, 
    limitPrice = 0.519,
    timeoutSeconds = 15,
    fallbackToMarket = true
    // limitNum
}= {}) => {

    if (ticker === 'FTSI') {
        await log('FTSI no selling today');
        return null;
    }

    console.log('ALPACA LIMIT SELL');
    str({ ticker, quantity, limitPrice });
    // const min = getMinutesFromOpen();
    // const extendedHours = min < 0 || min > 390;
    const data = {
        symbol: ticker, // any valid ticker symbol
        qty: Number(quantity),
        side: 'sell',
        type: 'limit',
        limit_price: Number(limitPrice),
        // ...extendedHours ? {
            extended_hours: true,
            time_in_force: 'day',
        // } : {
        //     time_in_force: 'day'
        // }
    };
    console.log('data sell alpaca', data)
    let order;
    try {
        order = await alpaca.createOrder(data);
    
        await new Promise(resolve => setTimeout(resolve, 1000 * timeoutSeconds));
        order = order && order.id ? await alpaca.getOrder(order.id) : {};

        if (!order.filled_at) {
            order.id && await alpaca.cancelOrder(order.id);
            order = fallbackToMarket ? await marketSell({ ticker, quantity }) : order;
        }

    } catch (e) {
        strlog({ e })
    }

    return order;

};

module.exports = limitSell;