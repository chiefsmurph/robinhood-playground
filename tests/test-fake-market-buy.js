const fakeMarketBuy = require('../alpaca/fake-market-buy');
module.exports = async (ticker = 'RVPH', quantity = 5) => {
    const response = await fakeMarketBuy({
        ticker,
        quantity: Number(quantity)
    });
    strlog({ response });
}