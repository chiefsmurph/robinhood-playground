const { alpaca } = require('.');

export default async _ => {
    const account = await alpaca.getAccount();
    console.log('Current Account:', account);

    // await alpaca.cancelOrder('c042dec8-3d52-4f86-b8fc-6061a8458e2f');
    console.log(
      await alpaca.getOrders()
    )

    // const order = await alpaca.createOrder({
    //     symbol: 'BPMX', // any valid ticker symbol
    //     qty: 1,
    //     side: 'buy',
    //     type: 'market',
    //     time_in_force: 'day',
    //     client_order_id: 'myorder' // optional
    // });

    // console.log(order)
};