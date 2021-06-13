const cancelAllOrders = async () => {
    console.log('canceling all orders...');
    try {
        const orders = await Robinhood.orders();
        // console.log(JSON.stringify(orders.results, null, 2));
        const pendingOrders = orders.results.filter(order => {
            return !['cancelled', 'filled'].includes(order.state);
        });
        console.log('orders', pendingOrders);
        const withoutGtc = pendingOrders.filter(order => order.time_in_force !== 'gtc');
        for (let order of withoutGtc) {
            console.log('order', order);
            await Robinhood.cancel_order(order);
        }
        withoutGtc.length && console.log('canceled', withoutGtc.length, 'orders');
    } catch (e) {
        console.log('error canceling all orders', e);
    }
};

module.exports = cancelAllOrders;
