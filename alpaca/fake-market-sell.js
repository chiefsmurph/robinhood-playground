const { alpaca } = require('.');
const lookup = require('../utils/lookup');

const orderAtPrice = ({ ticker, quantity, limitPrice }) =>
    alpaca.createOrder({
        symbol: ticker, // any valid ticker symbol
        qty: Number(quantity),
        side: 'buy',
        type: 'fok',
        limit_price: Number(limitPrice.toFixed(4)),
        extended_hours: true,
        time_in_force: 'day',
    });

module.exports = async ({ ticker, quantity }) => {
    const { bidPrice, lastTrade } = await lookup(ticker);
    const atLastTrade = await orderAtPrice({ ticker, quantity, limitPrice: lastTrade });
    if (atLastTrade.filled_at) {
        console.log(`filled ${ticker} buy @ ${atLastTrade.filled_at}`);
        return atLastTrade;
    }
    const atBid = await orderAtPrice({ ticker, quantity, limitPrice: bidPrice });
    if (atBid.filled_at) {
        console.log(`filled ${ticker} buy @ ${atBid.filled_at}`);
    } else {
        console.log(`unable to fill ${ticker}`);
    }
    return atBid;
};