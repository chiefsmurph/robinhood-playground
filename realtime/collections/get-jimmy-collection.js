const { pick } = require('underscore');
const isJimmyPick = require('../../utils/is-jimmy-pick');

module.exports = async baseCollections => {
  strlog({ baseCollections });
  const ofInterest = Object.values(baseCollections).flatten().filter(({ ticker, quote }) => !quote || quote.currentPrice < 1.5);
  strlog({ ofInterest })
  const analyzed = await isJimmyPick(
    ofInterest.map(({ ticker }) => ticker)
  );
  strlog({ analyzed })
  return Object.keys(analyzed).filter(ticker => analyzed[ticker].isJimmyPick);
};