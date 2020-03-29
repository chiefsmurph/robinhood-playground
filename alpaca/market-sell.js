const { alpaca } = require('.');

module.exports = async ({ 
    ticker = 'IMBI', 
    quantity = 14,
    timeoutSeconds = 60, 
} = {}) => {
    console.log('ALPACA MARKET SELL');
    str({ ticker, quantity });
    const data = {
        symbol: ticker, // any valid ticker symbol
        qty: Number(quantity),
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
    };
    strlog({ data})
    let order;
    try {
        order = await alpaca.createOrder(data);
    } catch (e) {
        strlog({ e })
    }
    if (!order || !order.id) {
        return null;
    }
    await new Promise(resolve => setTimeout(resolve, 1000 * timeoutSeconds));
    return alpaca.getOrder(order.id);
};