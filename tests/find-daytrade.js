const { alpaca } = require('../alpaca');
const cancelAllOrders = require('../alpaca/cancel-all-orders');

module.exports = async () => {

  const getNumDayTrades = async () => {
    const account = await alpaca.getAccount();
    return account.daytrade_count;
  };


  console.log({ num: await getNumDayTrades() })

  const orders = await alpaca.getOrders({ status: 'open' });

  let curCount = await getNumDayTrades();
  for (let order of orders) {
    strlog({
      canceling: order
    })
    await alpaca.cancelOrder(order.id);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newCount = await getNumDayTrades();
    if (curCount !== newCount) {
      console.log('found the culprit');
      await log(`FOUND A DAYTRADE FOR ${order.symbol}`, order);
      strlog({ order });
      if (order.symbol) {
        // both sides
        await cancelAllOrders(order.symbol);
        await log(`CANCELED ALL ORDERS FOR ${order.symbol}`);
      }
      break;
    }
    curCount = newCount;
  }
  // strlog({ orders })
};