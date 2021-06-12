const fakeMarketBuy = require('../alpaca/fake-market-buy');
export default async (ticker = 'RVPH', quantity = 5) => {
    const response = await fakeMarketBuy({
        ticker,
        quantity: Number(quantity)
    });
    strlog({ response });
}