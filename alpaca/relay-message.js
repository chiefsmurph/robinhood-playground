const setDescription = require('../insta/set-description');
const getPositions = require('./get-positions');

module.exports = async () => {
  let positions = await getPositions();
  const formatPrice = price => price.toFixed(price < 1 ? 4 : 2);
  const descriptionMessage = 'my location: Palm Springs, CA\nmy current stocks: ' + positions.map(({ ticker, avgEntry }) => `${ticker} @ ${formatPrice(avgEntry)}`).join(' and ');
  strlog({ positions, descriptionMessage });
  await setDescription(descriptionMessage);
};