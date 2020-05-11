const { pick } = require('underscore');
const isJimmyPick = require('../../utils/is-jimmy-pick');

module.exports = async baseCollections => {
  console.log('getting jimmy collection based on base base collections...')
  // strlog({ baseCollections });
  const ofInterest = Object.values(baseCollections).flatten().filter(({ ticker, quote }) => !quote || quote.currentPrice < 1.5);
  // strlog({ ofInterest })
  const analyzed = await isJimmyPick(
    ofInterest.map(({ ticker }) => ticker)
  );
  strlog({ analyzed })
  return (analyzed || []).filter(({ isJimmyPick }) => isJimmyPick);
};