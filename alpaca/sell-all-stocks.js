const getPositions = require('./get-positions');
const sellPosition = require('./sell-position');
const Log = require('../models/log');

module.exports = async () => {
  const percToSell = 5;
  await log(`selling all stocks: ${percToSell}%`);
  let positions = await getPositions();
  await Promise.all(
    positions
      .filter(({ wouldBeDayTrade }) => !wouldBeDayTrade)
      .map(position => 
        sellPosition({
          ...position,
          percToSell, // HAHAHAHAHA 100,
        }, 7)
      )
  );
  await log('done selling all');
};