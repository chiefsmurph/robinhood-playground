const request = require('request-promise');
const getTrendAndSave = require('./get-trend-and-save');

let sp500, top100RH;

const limitToLowSpread = trend => 
    // limit to only low spread
    trend = trend.filter(o =>
        o.quote_data &&
        o.quote_data.askPrice && 
        o.quote_data.askPrice < o.quote_data.currentPrice * 1.004
    );

module.exports = async (min) => {

    // first calculate pricePerm trends
    let trend = await getTrendAndSave(min + '*');
    let pricePerms = {
        under5: [0, 5],
        fiveTo10: [5, 10],
        tenTo15: [10, 15],
        fifteenTo20: [15, 20]
    };
    const priceTrends = {
        all: trend
    };
    Object.keys(pricePerms).forEach(priceKey => {
        const [lowBounds, highBounds] = pricePerms[priceKey];
        const trendFilteredByPricePerm = trend.filter(stock => {
            return stock.quote_data.lastTrade > lowBounds && stock.quote_data.lastTrade <= highBounds;
        });
        priceTrends[priceKey] = trendFilteredByPricePerm;
    });

    // sp 500
    sp500 = sp500 || await (async () => {
        console.log('getting sp500 stocks')
        const sp500url = 'https://pkgstore.datahub.io/core/s-and-p-500-companies/constituents_json/data/64dd3e9582b936b0352fdd826ecd3c95/constituents_json.json';
        return JSON.parse(
            await request(sp500url)
        ).map(o => o.Symbol);
    })();

    // top 100
    top100RH = top100RH || await (async () => {
        console.log('getting top100RH stocks');
        const {
            instruments: top100RHinstruments
        } = await Robinhood.url('https://api.robinhood.com/midlands/tags/tag/100-most-popular/');
        let top100RHtrend = await mapLimit(top100RHinstruments, 3, async instrumentUrl => {
            const instrumentObj = await Robinhood.url(instrumentUrl);
            return {
                ...instrumentObj,
                instrumentUrl,
                ticker: instrumentObj.symbol
            };
        });
        return top100RHtrend.map(t => t.ticker);
    })();

    
    const additional = {
        sp500,
        top100RH
    };
    
    const additionalWithTrend = Object.keys(additional).reduce((acc, key) => ({
        ...acc,
        [key]: additional[key].map(ticker => 
            trend.find(t => t.ticker === ticker)
        ).filter(Boolean)
    }), {});
    
    return {
        ...priceTrends,
        ...additionalWithTrend
    };
};