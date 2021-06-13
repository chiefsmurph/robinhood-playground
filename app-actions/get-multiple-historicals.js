const chunkApi = require('../utils/chunk-api');
const getTrend = require('../utils/get-trend');
const cacheThis = require('../utils/cache-this');

module.exports = cacheThis(
    async (tickers, qs = 'interval=day') => {
        console.log({ tickers, qs })
        const allHistoricals = await chunkApi(
            tickers,
            async (tickerStr) => {
                // console.log({ tickerStr })
                const { results } = await Robinhood.url(`https://api.robinhood.com/quotes/historicals/?symbols=${tickerStr}&${qs}`);
                return results;
            },
            75,
            'robinhood quotes'
        );

        // console.log({ tickers, allHistoricals });


        return allHistoricals.map(obj => {

            let prevClose;
            return obj ? obj.historicals.map(hist => {
                ['open_price', 'close_price', 'high_price', 'low_price'].forEach(key => {
                    hist[key] = Number(hist[key]);
                });
                if (prevClose) {
                    hist.trend = getTrend(hist.close_price, prevClose);
                }
                prevClose = hist.close_price;
                return hist;
            }) : [];

        });


    },
    6
);