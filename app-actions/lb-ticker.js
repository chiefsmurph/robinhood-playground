const lookup = require('../utils/lookup');
const limitBuyMultiple = require('./limit-buy-multiple');

module.exports = async (ticker, totalAmtToSpend = 20) => {
  const { currentPrice } = await lookup(ticker);
  console.log(`buying ${ticker} $${totalAmtToSpend} @ $${currentPrice}`)
  return limitBuyMultiple({
    totalAmtToSpend: Number(totalAmtToSpend),
    withPrices: [{
      ticker,
      price: currentPrice
    }],
    strategy: 'lbtickers'
  })
};