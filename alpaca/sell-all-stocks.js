const getPositions = require('./get-positions');
const sellPosition = require('./sell-position');

module.exports = async () => {
  const positions = await getPositions();
  return Promise.all(
    positions
      .filter(({ ticker }) => ticker !== 'TUES')
      .filter(({ wouldBeDayTrade }) => !wouldBeDayTrade)
      .map(position => sellPosition({
        ...position,
        percToSell: 100
      }))
  );
};