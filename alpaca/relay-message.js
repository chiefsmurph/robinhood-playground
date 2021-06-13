const setDescription = require('../insta/set-description');
const getPositions = require('./get-positions');

const roundTo = digits => n => Math.round(n * Math.pow(10, digits)) / Math.pow(10, digits); 
const formatPrice = price => roundTo(price < 1 ? 4 : 2)(price);

module.exports = async () => {
  let positions = await getPositions();
  positions = positions.filter(position => !position.isSelling);
  // const descriptionMessage = 'my location: Palm Springs, CA\nmy current stocks: ' + 
  const descriptionMessage = positions.slice(0, 5).map(({ ticker, avgEntry }) => `${ticker} @ ${formatPrice(avgEntry)}`).join('\n');
  await setDescription(descriptionMessage);
};