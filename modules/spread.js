// utils
const regCronIncAfterSixThirty = require('../utils/reg-cron-after-630');

// app-actions
const executeStrategy = require('../app-actions/execute-strategy');
const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');

Array.prototype.ticks = function() {
    return this.map(t => t.ticker);
};

const trendFilter = async (trend) => {

    console.log('total trend stocks', trend.length);

    let withTrendSinceOpen = await addOvernightJumpAndTSO(trend);
    withTrendSinceOpen = withTrendSinceOpen
        .map(t => ({
            ...t,
            askPrice: t.quote_data.askPrice,
            bidPrice: t.quote_data.bidPrice,
            lastTrade: t.quote_data.lastTrade
        }))
        .filter(buy => buy.trendSinceOpen && buy.askPrice && buy.bidPrice && buy.lastTrade)
        .map(t => ({
            ...t,
            spreadAbs: t.askPrice - t.bidPrice
        }))
        .map(t => ({
            ...t,
            spreadPerc: Math.round(t.spreadAbs / t.lastTrade * 100)
        }));
    // console.log(JSON.stringify(withTrendSinceOpen, null, 2));

    const singleHighestSpreadWithFilter = prop => (filter = () => true) => {
        return withTrendSinceOpen
            .filter(filter)
            .sort((a, b) => b[prop] - a[prop])
            .slice(0, 1)
            .ticks();
    };

    const highestAbsoluteSpread = singleHighestSpreadWithFilter('spreadAbs');
    const highestPercSpread = singleHighestSpreadWithFilter('spreadPerc');

    const bidAskLastTradeSame = (({ quote_data: { ask_price, bid_price, last_trade_price }}) => 
        ask_price === bid_price && bid_price === last_trade_price
    );
    return {
        bidAskLastTradeSame: withTrendSinceOpen
            .filter(bidAskLastTradeSame).ticks(),
        bidAskLastTradeSame500kVolume: withTrendSinceOpen
            .filter(t => Number(t.fundamentals.volume) > 500000)
            .filter(bidAskLastTradeSame)
            .ticks(),

        singleLargestSpreadAbs: highestAbsoluteSpread(),
        singleLargestSpreadAbs100kVolume: highestAbsoluteSpread(t => Number(t.fundamentals.volume) > 100000),
        singleLargestSpreadAbs500kVolume: highestAbsoluteSpread(t => Number(t.fundamentals.volume) > 500000),
        singleLargestSpreadAbs1milVolume: highestAbsoluteSpread(t => Number(t.fundamentals.volume) > 1000000),


        singleLargestSpreadPerc: highestPercSpread(),
        singleLargestSpreadPerc100kVolume: highestPercSpread(t => Number(t.fundamentals.volume) > 100000),
        singleLargestSpreadPerc500kVolume: highestPercSpread(t => Number(t.fundamentals.volume) > 500000),
        singleLargestSpreadPerc1milVolume: highestPercSpread(t => Number(t.fundamentals.volume) > 1000000),

    };
};

const spread = {
    name: 'spread',
    trendFilter,
    // run: [58, 123, 202],
};

module.exports = spread;
