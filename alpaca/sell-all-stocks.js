const getPositions = require('./get-positions');
const sellPosition = require('./sell-position');

module.exports = async () => {
  const positions = await getPositions();
  await Promise.all(
    positions
      .filter(({ ticker }) => ['AMC', 'EXPR'].includes(ticker))
      .filter(({ wouldBeDayTrade }) => !wouldBeDayTrade)
      .map(position => 
        sellPosition({
          ...position,
          percToSell: 70, // HAHAHAHAHA 100,
        }, 5)
      )
  );
  await log('done selling all');
};