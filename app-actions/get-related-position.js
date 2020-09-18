global.getRelatedPosition = ticker => {
  const { positions } = require('../socket-server/strat-manager');
  if (!positions) return {};
  return (positions.alpaca || []).find(pos => pos.ticker === ticker) || {};
};