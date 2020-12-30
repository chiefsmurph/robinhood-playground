const cacheThis = require('./cache-this');
module.exports = cacheThis(
    async () => +Number((await Robinhood.url('https://api.robinhood.com/marketdata/forex/quotes/3d961844-d360-45fc-989b-f6fca761d511/')).mark_price).toFixed(2),
    (1 / 60) * 6   // 6 seconds lol
);