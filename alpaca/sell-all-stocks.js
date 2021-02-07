const getPositions = require('./get-positions');
const sellPosition = require('./sell-position');

module.exports = async () => {
  const positions = await getPositions();
  await Promise.all(
    positions
      .filter(({ wouldBeDayTrade }) => !wouldBeDayTrade)
      .map(position => sellPosition({
        ...position,
        percToSell: 100,
        numSeconds: 60 * 60 * 3
      }))
  );
  await log('done selling all');
};