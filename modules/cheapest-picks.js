const trendFilter = async (trend, min, priceKey) => {

    // cheap stocks that have gone down the most since open
    // but still going up recently 30 & 7 day trending
    // dont buy stocks that have fluctuated a lot before today

    console.log('running cheapest-picks strategy', priceKey);

    trend = trend.sort((a, b) => a.last_trade_price - b.last_trade_price);

    const mapTickers = buys => buys.map(t => t.ticker);

    return {
        chp1: mapTickers(trend.slice(0, 1)),
        chp3: mapTickers(trend.slice(0, 3)),
        chp5: mapTickers(trend.slice(0, 5)),
        chp10: mapTickers(trend.slice(0, 10)),
        chp15: mapTickers(trend.slice(0, 15)),
        chp30: mapTickers(trend.slice(0, 30)),
        chp50: mapTickers(trend.slice(0, 50)),
    };
    // console.log(trend);

};

const cheapestPicks = {
    name: 'cheapest-picks',
    trendFilter,
    run: [-4, 4, 65, 125, 175, 225, 386],
    trendFilterKey: ['under5'] // only run under5
};


module.exports = cheapestPicks;
