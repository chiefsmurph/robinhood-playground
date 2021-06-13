const getActiveHalts = require('./get-active-halts');
module.exports = async (ticker) => {
  const activeHalts = await getActiveHalts();
  const foundHalt = activeHalts.find(halt => halt.issueSymbol === ticker);
  strlog({ activeHalts, foundHalt })
  return foundHalt || false;
};