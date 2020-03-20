
const { alpaca } = require('../../alpaca');
const Hold = require('../../models/Holds');
const analyzePosition = require('./analyze-position');

const addUnrealizedPl = async positions => {
  
  const alpacaPositions = await alpaca.getPositions();
  const withPositions = await mapLimit(positions, 1, position => {
    return {
      ...position,
      position: alpacaPositions.find(pos => pos.symbol === position.ticker)
    }
  });
  strlog({
    'stale tickers': withPositions.filter(pos => !pos.position).map(pos => pos.ticker)
  })

  strlog({
    delete: await Hold.find({ 
      ticker: {
        $in: withPositions.filter(pos => !pos.position).map(pos => pos.ticker)
      }
    }).remove()
  })
  return withPositions
    .map(position => {
      const {
        market_value: marketValue,
        unrealized_pl: unrealizedPl
      } = position.position || {};
      delete position.position;
      return {
        ...position,
        marketValue,
        unrealizedPl: Number(unrealizedPl),
      };
    });
};


module.exports = async () => {
  const holds = await Hold.find({}).lean();
  return mapLimit(
    holds,
    2,
    async hold => ({
      ...hold,
      ...analyzePosition(
        await addUnrealizedPl(hold)
      )
    })
  );
};