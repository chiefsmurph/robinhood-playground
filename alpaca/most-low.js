const { alpaca } = require('.');

module.exports = async () => {
  const positions = await alpaca.getPositions();
  const sortedByUnrealizedPlPc = positions.sort((a, b) => Number(a.unrealized_plpc) - Number(b.unrealized_plpc));
  strlog({ sortedByUnrealizedPlPc});
  sortedByUnrealizedPlPc
    .filter(({ market_value }) => Number(market_value) < 400)
    .slice(0, 2)
    .forEach(position => {
      const { symbol } = position;
      console.log(`MOST LOW - ${symbol}`);
      require('../realtime/RealtimeRunner').handlePick({
        strategyName: 'most-low',
        ticker: symbol,
        data: { 
          position
        }
      }, true);
    });
};