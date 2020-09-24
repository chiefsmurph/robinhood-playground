// lookup ticker last trade price
// ticker -> {
//     last_trade_price,
//     previous_close,
//     yahooPrice,
//     instrument
// }
const { lookup } = require('yahoo-stocks');
const formatQuoteData = require('./format-quote-data');
const { alpaca } = require('../alpaca');

module.exports = async (ticker) => {
    // console.log('looking up', ticker);
    // const alpacaResponse = await alpaca.lastQuote(ticker);
    // const alpacaTrade = await alpaca.lastTrade(ticker);
    // strlog({ alpacaResponse})
    const quoteDataResponse = await Robinhood.quote_data(ticker);
    // strlog({
    //     alpacaResponse,
    //     alpacaTrade,
    //     quoteDataResponse,
    //     ASSET: await alpaca.getAsset(ticker)
    // })
    const originalQuoteData = (quoteDataResponse.results || [])[0];
    
    // add yahoo price
    try {
        var yahooPrice = (await lookup(ticker)).currentPrice;
    } catch (e) {}

    const finalLookupObj = {
        ...formatQuoteData(originalQuoteData),
        yahooPrice
    };

    strlog({
        finalLookupObj
    })
    return finalLookupObj;
};
