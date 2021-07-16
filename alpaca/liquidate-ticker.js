const cancelAllOrders = require('./cancel-all-orders');
const Log = require('../models/Log');
const { alpaca } = require('.');

const liquidateTicker = async (ticker, force = false) => {
  await cancelAllOrders(ticker);
  const boughtToday = await Log.boughtToday(ticker);
  await log(`liquidating ticker ${ticker} - boughtToday ${boughtToday}`);
  if (!boughtToday || force) {
    await alpaca.closePosition(ticker);
    await log(`liquidated ${ticker}`);
  } else {
    await log(`no liquidation necessary ${ticker}`);
  }
};

module.exports = liquidateTicker;