
const formatQuoteData = (originalQuoteData) => {
    const { 
        last_trade_price, 
        adjusted_previous_close,
        instrument,
        ask_price,
        bid_price,
        last_extended_hours_trade_price
    } = originalQuoteData;
    let additionalData = {
        lastTrade: Number(last_trade_price),
        prevClose: Number(adjusted_previous_close),
        askPrice: Number(ask_price),
        bidPrice: Number(bid_price),
        afterHoursPrice: Number(last_extended_hours_trade_price),
    };
    return {
        ...additionalData,
        instrument,
        currentPrice: additionalData.afterHoursPrice || additionalData.lastTrade,
        rawQuote: originalQuoteData
    };
};


module.exports = formatQuoteData;