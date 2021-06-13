const getTrendAndSave = require('../app-actions/get-trend-and-save');
const login = require('../rh-actions/login');

const mapLimit = require('promise-map-limit');

const addOvernightJump = require('../app-actions/add-overnight-jump-and-tso');
const getUpStreak = require('../app-actions/get-up-streak');
const { avgArray } = require('../utils/array-math');
const getTrend = require('../utils/get-trend');

const getHistorical = async ticker => {
    const historicalDailyUrl = `https://api.robinhood.com/quotes/historicals/${ticker}/?interval=day`;
    let { historicals } = await Robinhood.url(historicalDailyUrl);
    return (historicals.length) ? historicals : null;
};


module.exports = async () => {

    // let trend = require('/Users/johnmurphy/Development/my-stuff/robinhood-playground/json/stock-data/2018-1-23 13:04:23 (+391).json');
    let trend = await getTrendAndSave();

    trend = await addOvernightJumpAndTSO(trend);


    let cheapBuys = trend
        .filter(stock => {
            return stock.quoteData.lastTrade > 5 && stock.quoteData.lastTrade < 6;
        });

    // var allTickers = require('../json/stock-data/allStocks');
    // allTickers = allTickers
    //     .filter(stock => stock.tradeable)
    //     .map(stock => stock.symbol);


    console.log('getting historicals')

    let curIndex = 0;
    // console.log('ey,', (cheapBuys.length / 10));
    cheapBuys = await mapLimit(cheapBuys, 20, async buy => {

        if (curIndex % Math.floor(cheapBuys.length / 10) === 0) {
            console.log('historical', curIndex, 'of', cheapBuys.length);
        }
        curIndex++;

        let prehistoricals = buy.historicals || [];

        let index = 0;
        let historicals = await mapLimit(prehistoricals, 1, async hist => {


            // console.log('about to get upstreak', hist);
            const upstreak = await getUpStreak(
                buy.ticker,
                prehistoricals.slice(0, index)
            );
            // console.log(index, prehistoricals.slice(0, index));
            // console.log(upstreak);


            index++;
            return {
                ...hist,
                ticker: buy.ticker,
                trend: getTrend(hist.close_price, hist.open_price),
                upstreak
            };

        });

        return {
            ...buy,
            historicals
        };

    });


    const top10volPerDay = {};
    cheapBuys.forEach(buy => {
        buy.historicals.forEach(hist => {
            let d = new Date(hist.begins_at);
            d.setDate(d.getDate() + 1);
            d = d.toLocaleDateString().split('/').join('-');
            // console.log('historicadaw', hist.upstreak);
            if (
                (getTrend(hist.close_price, hist.open_price) > 10) ||
                (hist.upstreak === 0)
            ) {
                return;
            } else {
                // console.log('not 0', hist.upstreak);
            }
            top10volPerDay[d] = (top10volPerDay[d] || []).concat({
                ticker: hist.ticker,
                volume: hist.volume
            });
        });
    });

    Object.keys(top10volPerDay).forEach(d => {
        top10volPerDay[d] = top10volPerDay[d]
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 10);
    });


    // sort by stock percUp

    console.log('\n top10volPerDay');
    // console.log(JSON.stringify(top10volPerDay, null, 2));

    Object.keys(top10volPerDay)
        .sort((a, b) => new Date(a) - new Date(b))
        .slice(0, Object.keys(top10volPerDay).length - 1)
        .forEach(key => {
            console.log('------------------');
            console.log('key', key);
            console.log('------------------');



            top10volPerDay[key].map((vol, i) => {

                const relBuy = cheapBuys.find(buy => buy.ticker === vol.ticker);
                const folDay = relBuy.historicals.findIndex(hist => {
                    let d = new Date(hist.begins_at);
                    d.setDate(d.getDate() + 1);
                    d = d.toLocaleDateString().split('/').join('-');
                    return d === key;
                });

                const followingDay = relBuy.historicals[folDay + 1];

                const returnObj = {
                    ...vol,
                    followingDay
                };

                console.log(JSON.stringify(returnObj, null, 2));
                // console.log(vol.ticker, '-', vol.volume);
                return returnObj;

            });

        });

};
