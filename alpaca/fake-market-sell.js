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
        side: 'sell',
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
    

export default async ({ ticker, quantity }) => {
    const { bidPrice, lastTrade } = await lookup(ticker);
    const atLastTrade = await orderAtPrice({ ticker, quantity, limitPrice: lastTrade });
    if (atLastTrade.filled_at) {
        console.log(`filled ${ticker} buy @ ${atLastTrade.filled_at}`);
        return atLastTrade;
    }
    const atBid = await orderAtPrice({ ticker, quantity, limitPrice: bidPrice });
    if (atBid.filled_at) {
        console.log(`filled ${ticker} buy @ ${atBid.filled_at}`);
        return atBid;
    }
    const atSuperBid = await orderAtPrice({ ticker, quantity, limitPrice: bidPrice * .96 });
    if (atSuperBid.filled_at) {
        console.log(`filled ${ticker} buy @ ${atSuperBid.filled_at}`);
    } else {
        console.log(`unable to fill ${ticker}`);
    }
    return atSuperBid;
};