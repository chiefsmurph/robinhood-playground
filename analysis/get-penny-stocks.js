// const login = require('../rh-actions/login');
const getTrendAndSave = require('../app-actions/get-trend-and-save');

module.exports = async () => {
    let trend = await getTrendAndSave();
    const pennies = trend
        .filter(stock => {
            return Number(stock.last_trade_price) < 1;
        })
        // .map(stock => ({
        //     ticker: stock.ticker,
        //     last_trade_price: stock.last_trade_price
        // }))
        // .sort((a, b) => Number(b.fundamentals.pe_ratio) - Number(a.fundamentals.pe_ratio))
        // .slice(0, 100)
        .sort((a, b) => Number(a.last_trade_price) - Number(b.last_trade_price))
        .map(({ticker, last_trade_price}) => ({
            ticker,
            price: last_trade_price
        }));
    console.log(JSON.stringify(pennies, null, 2))
    return pennies;
};
