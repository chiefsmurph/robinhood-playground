const getPositions = require('./get-positions');
const sellPosition = require('./sell-position');

export default async () => {
  const percToSell = 3;
  await log(`selling all stocks: ${percToSell}%`);
  let positions = await getPositions();
  await Promise.all(
    positions
      .filter(({ wouldBeDayTrade }) => !wouldBeDayTrade)
      .map(position => 
        sellPosition({
          ...position,
          percToSell, // HAHAHAHAHA 100,
        }, 7 * 10)  // 7 minutes what!!
      )
  );
  await log('done selling all');
};