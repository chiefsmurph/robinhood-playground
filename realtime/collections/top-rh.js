const getRhStocks = async (rhTag = '100-most-popular') => {
    console.log(`getting robinhood ${rhTag} stocks`);
    const {
        instruments: top100RHinstruments
    } = await Robinhood.url(`https://api.robinhood.com/midlands/tags/tag/${rhTag}/`);
    let top100RHtrend = await mapLimit(top100RHinstruments, 3, async instrumentUrl => {
        const instrumentObj = await Robinhood.url(instrumentUrl);
        return {
            ...instrumentObj,
            instrumentUrl,
            ticker: instrumentObj.symbol
        };
    });
    strlog({ top100RHtrend })
    return top100RHtrend.map(t => t.ticker);
};

module.exports = getRhStocks