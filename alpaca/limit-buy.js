
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const { alpaca } = require('.');
const marketBuy = require('./market-buy');

const alpacaLimitBuy = async ({
  ticker = 'PRVB',
  limitPrice = 6,
  quantity = 16,
  timeoutSeconds = 15,
  fallbackToMarket = true,
} = {}) => {
  // queue alpaca limit order 4% above pickPrice
  console.log('ALPACA LIMIT BUY');
  str({ ticker, quantity, limitPrice });
  const min = getMinutesFromOpen();
  const extendedHours = min < 0 || min > 390;
  const data = {
      symbol: ticker, // any valid ticker symbol
      qty: Number(quantity),
      side: 'buy',
      type: 'limit',
      limit_price: Number(limitPrice.toFixed(4)),
      // ...extendedHours ? {
          extended_hours: true,
          time_in_force: 'day',
      // } : {
      //     time_in_force: 'day'
      // }
  };
  console.log('data buy alpaca', data)
  let order;
  try {
      order = await alpaca.createOrder(data);

    await new Promise(resolve => setTimeout(resolve, 1000 * timeoutSeconds));
    order = order && order.id ? await alpaca.getOrder(order.id) : {};

    if (!order.filled_at) {
      order.id && await alpaca.cancelOrder(order.id);
      order = fallbackToMarket 
        ? {
          alpacaOrder: await marketBuy({ ticker, quantity }),
          marketFallback: true
        }
        : order;
    }

  } catch (e) {
    strlog({ e })
  }

  return order;

};

module.exports = alpacaLimitBuy;
