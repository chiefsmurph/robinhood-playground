// pass an array of tickers or a single ticker string

// npm
const mapLimit = require('promise-map-limit');

// utils
const getTrend = require('../utils/get-trend');
const chunkApi = require('../utils/chunk-api');
const lookup = require('../utils/lookup');
const formatQuoteData = require('../utils/format-quote-data');

const formatStock = stock => {
    // console.log('formatting', stock)
    const { quote_data } = stock;
    const shouldFormatQD = !quote_data.lastTrade;
    const actualQD = shouldFormatQD ? formatQuoteData(quote_data) : quote_data;
    const { lastTrade, prevClose } = actualQD;
    const withAdditionalProps = {
        ...stock,
        symbol: stock.ticker,
        quote_data: actualQD,
        last_trade_price: lastTrade,
        previous_close: prevClose,
        trend_since_prev_close: getTrend(lastTrade, prevClose)
    };
    return withAdditionalProps;
};

const getTrendSinceOpen = {
    single: async (ticker) => {
        console.log('tick', ticker);
        try {
            var [fundamentals, lookup_data] = await Promise.all([
                Robinhood.fundamentals(ticker),
                lookup(ticker)
            ]);
            fundamentals = fundamentals.results[0];
        } catch (e) {
            console.log(e, 'error getting trend', ticker);
            return {};
        }

        const { open } = fundamentals;
        
        const stockObj = {
            ticker,
            fundamentals,
            quote_data: lookup_data,
            open,
        };
        return formatStock(stockObj);
    },
    multiple: async (stocks) => {

        console.log('multiple')
        let quotes = await chunkApi(
            stocks,
            async (tickerStr) => {
                // console.log('ti', tickerStr);
                const { results } = await Robinhood.url(`https://api.robinhood.com/quotes/?symbols=${tickerStr}`);
                return results;
            },
            1630,
            'robinhood quotes'
        );

        quotes = quotes.filter(q => !!q);

        let withQuotes = stocks.map((ticker, i) => {
            let relatedQuote = quotes.find(q => q.symbol === ticker) || {};
            const stockObj = {
                ticker,
                quote_data: relatedQuote
            };
            return formatStock(stockObj);
        });

        // console.log(quotes, quotes.length, stocks.length);

        // let withQuotes = await mapLimit(splitIntoChunks(stocks, 1630), 1, async collection => {
        //     const { results } = await Robinhood.url(`https://api.robinhood.com/quotes/?symbols=${collection.join(',')}`);
        //     console.log(results);
        //     return results.map((quoteData, i) => {
        //         if (!quoteData) {
        //             console.log('ticker no good', collection[i]);
        //         }
        //         quoteData = quoteData || {};
        //         return {
        //             ticker: collection[i],
        //             quote_data: quoteData,
        //             last_trade_price: Number(quoteData.last_trade_price),
        //             previous_close: Number(quoteData.previous_close),
        //             trend_since_prev_close: getTrend(quoteData.last_trade_price, quoteData.previous_close)
        //         };
        //     });
        // });
        //
        // withQuotes = flatten(withQuotes);

        // console.log(withQuotes, 'withQuotes');

        return withQuotes;

        // let withFundamentals = await mapLimit(splitIntoChunks(withQuotes, 10), 1, async collection => {
        //     const tickers = collection.map(obj => obj.ticker);
        //     const { results } = await Robinhood.url(`https://api.robinhood.com/fundamentals/?symbols=${tickers.join(',')}`);
        //     console.log(results);
        //     return results.map((fundamentals, i) => {
        //         fundamentals = fundamentals || {};
        //         return {
        //             ...collection[i],
        //             fundamentals,
        //             open: fundamentals.open,
        //             trend_since_open: getTrend(collection[i].last_trade_price, fundamentals.open),
        //         };
        //     });
        // });
        //
        // withFundamentals = flatten(withFundamentals);
        // console.log(withFundamentals, 'withFundamentals');


        // var timer = (() => {
        //     const start = new Date();
        //     return {
        //         stop: function() {
        //             const end = new Date();
        //             const time = end.getTime() - start.getTime();
        //             return time;
        //         }
        //     };
        // })();

        // let curIndex = 0;
        // let result = await mapLimit(stocks, 20, async ticker => {
        //     curIndex++;
        //     console.log(
        //         'getting trend',
        //         curIndex + ' of ' + stocks.length,
        //         ticker
        //     );
        //     try {
        //         const trend = await getTrendSinceOpen.single(ticker);
        //         console.log(trend, 'trend');
        //         return {
        //             ticker,
        //             ...trend
        //         };
        //     } catch (e) {
        //         return {
        //             ticker
        //         }
        //     }
        //
        // });
        //
        // result = result
        //     .filter(obj => obj.trend_since_open)
        //     .sort((a, b) => b.trend_since_open - a.trend_since_open);

        // console.log('result', result);
        // const length = timer.stop();
        // console.log('time', length, length / stocks.length);

        return result;
    }
};

module.exports = async (input) => {
    if (Array.isArray(input)) {
        return getTrendSinceOpen.multiple(input);
    } else {
        return getTrendSinceOpen.single(input);
    }
};
