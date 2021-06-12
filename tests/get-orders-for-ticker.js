const { alpaca } = require('../alpaca');
export default async (ticker = 'NEW') => {
    const orders = await alpaca.getOrders({ limit: 30000});
    const filtered = orders.filter(order => order.symbol === ticker);
    strlog({filtered});
};