const chunkApi = require('./chunk-api');

const lookupMultiple = async (tickersToLookup, detailedQuote) => {
    // takes in array of tickers
    // returns object of tickers and current prices
    let quotes = await chunkApi(
        tickersToLookup,
        async (tickerStr) => {
            const url = `https://api.robinhood.com/quotes/?symbols=${tickerStr}`;
            // console.log(url);
            // console.log('ti', tickerStr);
            const { results } = await Robinhood.url(url);
            return results;
        },
        1630,
        'robinhood quotes'
    );
    // console.log(quotes, 'quotes')
    const tickerLookups = {};
    quotes.forEach(quote => {
        if (!quote) return;
        const { symbol, last_trade_price, last_extended_hours_trade_price, ask_price, adjusted_previous_close } = quote;
        const currentPrice = Number(last_extended_hours_trade_price || last_trade_price);
        tickerLookups[symbol] = detailedQuote ? {
            lastTradePrice: Number(last_trade_price),
            afterHoursPrice: Number(last_extended_hours_trade_price),
            askPrice: Number(ask_price),
            currentPrice,
            prevClose: Number(adjusted_previous_close)
        } : currentPrice;
    });
    return tickerLookups;
};

module.exports = lookupMultiple;