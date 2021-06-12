const { alpaca } = require('.');

const alpacaMarketBuy = async ({ 
    ticker = 'SCON', 
    quantity = 200,
    timeoutSeconds = 30
} = {}) => {
    console.log('ALPACA MARKET BUY');
    str({ ticker, quantity });
    const data = {
        symbol: ticker, // any valid ticker symbol
        qty: Number(quantity),
        side: 'buy',
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

export default alpacaMarketBuy;