module.exports = async (ticker, side) => {
    console.log({ ticker, side})
    const { alpaca } = require('.');
    const orders = await alpaca.getOrders({
        status: 'open'
    });
    // str({ orders })

    const matchingOrders = orders.filter(order => {
        return (
            (order.symbol === ticker || !ticker) &&
            (order.side === side || !side)
        );
    });
    str({ matchingOrders });

    for (let order of matchingOrders) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await log(`canceling specific order id ${order.id} for ${ticker}`, {order}); 
        console.log(await alpaca.cancelOrder(order.id));
    }

    if (matchingOrders.length) {
        const logStr = [
            `canceled ${matchingOrders.length} orders`,
            ticker && `on ${ticker}`,
            side && `canceled ${side}s`
        ].filter(Boolean).join(' ');
        await log(logStr);
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

};