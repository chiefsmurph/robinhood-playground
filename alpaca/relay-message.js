const setDescription = require('../insta/set-description');
const getPositions = require('./get-positions');

module.exports = async () => {
  let positions = await getPositions();
  positions = positions.filter(position => !position.isSelling);
  const formatPrice = price => price.toFixed(price < 1 ? 4 : 2);
  // const descriptionMessage = 'my location: Palm Springs, CA\nmy current stocks: ' + 
  const descriptionMessage = positions.map(({ ticker, avgEntry }) => `${ticker} @ ${formatPrice(avgEntry)}`).join(' and ');
  strlog({ positions, descriptionMessage });
  await setDescription(descriptionMessage);
};