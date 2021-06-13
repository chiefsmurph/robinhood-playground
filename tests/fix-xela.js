const { alpaca } = require('../alpaca');

module.exports = async () => {
  const order = await alpaca.cancelOrder('22351cfa-9ca8-4f51-b38d-e9f4d2ae224f');
  strlog({ order })
};