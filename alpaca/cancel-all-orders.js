module.exports = async (ticker, side) => {
    console.log({ ticker, side})
    const { alpaca } = require('.');
    const orders = await alpaca.getOrders({
        status: 'open'
    });
    // str({ orders })

    const matchingOrders = orders.filter(order => {
        return (
            (order.symbol === ticker || ticker === undefined) &&
            (order.side === side || side === undefined)
        );
    });
    str({ matchingOrders });

    for (let order of matchingOrders) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await log(`canceling specific order id ${order.id} for ${ticker}`, {order}); 
        console.log(await alpaca.cancelOrder(order.id));
    }

    if (matchingOrders.length && ticker && side) {
        await log(`canceled ${matchingOrders.length} orders on ${ticker} canceled ${side}s`);
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

};