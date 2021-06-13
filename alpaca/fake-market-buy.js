const { alpaca } = require('.');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const lookup = require('../utils/lookup');

const orderAtPrice = async ({ ticker, quantity, limitPrice }) => {
    const min = getMinutesFromOpen();
    const extendedHours = min < 0 || min > 390;
    console.log(`trying ${limitPrice}`);
    const order = await alpaca.createOrder({
        symbol: ticker, // any valid ticker symbol
        qty: Number(quantity),
        side: 'buy',
        type: 'limit',
        limit_price: Number(limitPrice.toFixed(4)),
        ...extendedHours ? {
            extended_hours: true,
            time_in_force: 'day',
        } : {
            time_in_force: 'fok',
        }
    });
    const filledOrder = await alpaca.getOrder(order.id);
    return filledOrder;
}
    

module.exports = async ({ ticker, quantity }) => {
    const { askPrice, lastTrade } = await lookup(ticker);
    const atLastTrade = await orderAtPrice({ ticker, quantity, limitPrice: lastTrade });
    if (atLastTrade.filled_at) {
        console.log(`filled ${ticker} buy @ ${atLastTrade.filled_at}`);
        return atLastTrade;
    }
    const atAsk = await orderAtPrice({ ticker, quantity, limitPrice: askPrice });
    if (atAsk.filled_at) {
        console.log(`filled ${ticker} buy @ ${atAsk.filled_at}`);
        return atAsk;
    }
    const atSuperAsk = await orderAtPrice({ ticker, quantity, limitPrice: askPrice * 1.04 });
    if (atSuperAsk.filled_at) {
        console.log(`filled ${ticker} buy @ ${atSuperAsk.filled_at}`);
    } else {
        console.log(`unable to fill ${ticker}`);
    }
    return atSuperAsk;
};