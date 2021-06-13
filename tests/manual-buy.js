const simpleBuy = require('../app-actions/simple-buy');
const alpacaMarketBuy = require('../alpaca/market-buy');
const lookup = require('../utils/lookup');

module.exports = async (rh, ticker, amt) => {
    amt = Number(amt);

    const { currentPrice } = await lookup(rh, ticker);

    try {
        const alpacaQuantity = Math.floor(amt / currentPrice);
        await alpacaMarketBuy(ticker, alpacaQuantity);
    } catch (e) {}

    const response = await simpleBuy({
        ticker,
        maxPrice: amt,
        strategy: 'manual-buy',
        min: 3000,
        pickPrice: currentPrice
    });

}