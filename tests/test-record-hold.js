const Holds = require('../models/Holds');
export default async () => {
  await Holds.registerAlpacaFill({
    ticker: 'OCGN',
    alpacaOrder: {
      filled_avg_price: 1.44,
      filled_qty: 2
    },

  })
}