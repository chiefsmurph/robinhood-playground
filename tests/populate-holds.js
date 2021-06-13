const { alpaca } = require('../alpaca');
const Pick = require('../models/Pick');
const { mapObject } = require('underscore');
const Holds = require('../models/Holds');

module.exports = async () => {

  const buys = (
    await alpaca.getOrders({
      status: 'all',
      // after: '2019-09-27T13:25:05.281Z',
      // until: Date,
      // limit: 400,
      direction: 'desc'
    })
  ).filter(order => order.side === 'buy' && order.status === 'filled');
  const byTicker = {};
  buys.forEach(order => {
    const { symbol } = order;
    byTicker[symbol] = [
      ...byTicker[symbol] || [],
      order
    ]
  });
  strlog({ byTicker });


  // for (let ticker of Object.keys(byTicker)) {
  //   await Holds.findOneAndDelete({ ticker });
  //   for (let order of byTicker[ticker]) {
  //     await Holds.registerAlpacaFill({
  //       ticker,
  //       alpacaOrder: order
  //     })
  //   }
  // }

  // strlog({ matchedUp })
}