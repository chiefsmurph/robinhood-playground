const positionManager = require('../utils/position-manager');

module.exports = async () => {
  positionManager.create({
    ticker: 'AAPL'
  })
};