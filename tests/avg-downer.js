const positionManager = require('../utils/position-manager');

export default async () => {
  positionManager.create({
    ticker: 'AAPL'
  })
};