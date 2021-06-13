const { alpaca } = require('../alpaca');
module.exports = async (ticker = 'NEW') => {
    const orders = await alpaca.getOrders({ limit: 30000});
    const filtered = orders.filter(order => order.symbol === ticker);
    strlog({filtered});
};