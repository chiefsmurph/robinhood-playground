// const getTrendAndSave = require('../app-actions/get-trend-and-save');
const login = require('../rh-actions/login');

const mapLimit = require('promise-map-limit');

const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');
const getUpStreak = require('../app-actions/get-up-streak');
const getTrendAndSave = require('../app-actions/get-trend-and-save');
const { avgArray } = require('../utils/array-math');
const getTrend = require('../utils/get-trend');


module.exports = async () => {

    const getHistorical = async ticker => {
        const historicalDailyUrl = `https://api.robinhood.com/quotes/historicals/${ticker}/?interval=day`;
        let { historicals } = await Robinhood.url(historicalDailyUrl);
        return (historicals.length) ? historicals : null;
    };


    // let trend = require('/Users/johnmurphy/Development/my-stuff/robinhood-playground/json/stock-data/2018-3-10 11:06:43 (+276).json');
    let trend = await getTrendAndSave();


    let cheapBuys = trend.filter(stock => {
        return stock.quoteData.lastTrade > 5 && stock.quoteData.lastTrade < 15;
    });

    cheapBuys = await addOvernightJumpAndTSO(cheapBuys);

    // var allTickers = require('../json/stock-data/allStocks');
    // allTickers = allTickers
    //     .filter(stock => stock.tradeable)
    //     .map(stock => stock.symbol);


    console.log('getting historicals')
    cheapBuys = await mapLimit(cheapBuys, 20, async buy => ({
        ...buy,
        historicals: await getHistorical(buy.ticker)
    }));


    const allResults = [];

    const days = Array.from(Array(7).keys());
    for (let i of days) {

        console.log('getting streak historicals for ', i);
        let dayName;

        let innerBuys = cheapBuys;
        innerBuys = innerBuys.filter(buy => buy.historicals);

        innerBuys = innerBuys.map(buy => {
            const historicals = (buy.historicals.slice(0, buy.historicals.length - i) || []);
            const mostRecentDay = buy.historicals.pop();
            if (!dayName) {
                dayName = mostRecentDay.begins_at;
                // console.log('most recent', mostRecentDay)
            }
            const recentTrend = getTrend(
                mostRecentDay.close_price,
                mostRecentDay.open_price,
            );
            return {
                ticker: buy.ticker,
                historicals,
                recentTrend,
                mostRecentDay
            };
        });

        innerBuys = await mapLimit(innerBuys, 20, async buy => ({
            ...buy,
            upstreak: await getUpStreak(buy.ticker, buy.historicals)
        }));

        innerBuys = innerBuys.map(buy => {
            delete buy.historicals;
            return buy;
        });

        const results = {};

        const breakdown = (n, matches) => {

            // const jumpedUp = matches.filter(b => b.overnightJump > 1);

            results[n] = {
                count: matches.length,
                percUp: matches.filter(b => Number(b.recentTrend) > 0).length / matches.length,
                avgToday: avgArray(matches.map(m => Number(m.recentTrend))),
                tickers: matches.map(m => m.ticker)
                // jumpedUp: {
                //     count: jumpedUp.length,
                //     percUp: jumpedUp.filter(b => Number(b.trend_since_open) > 0).length / jumpedUp.length,
                //     avgToday: avgArray(jumpedUp.map(m => Number(m.trend_since_open)))
                // }
            };
        };

        [2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(n => {

            const matches = innerBuys.filter(b => b.upstreak === n);
            breakdown(n, matches);

        });

        breakdown('>10', innerBuys.filter(b => b.upstreak > 10));

        allResults.push({
            day: dayName,
            ...results
        });

    }


    // aggregate allResults

    let aggResults = allResults.reduce((acc, val) => {
        Object.keys(val).forEach(key => {
            acc[key] = (acc[key] || []).concat(val[key]);
        });
        return acc;
    }, {});

    console.log(JSON.stringify(aggResults, null, 2));

    aggResults = Object.keys(aggResults).reduce((acc, key) => {
        if (key === 'day') return acc;
        acc[key] = Object.keys(aggResults[key][0]).reduce((innerAcc, innerKey) => {
            const allInnerKeyVals = aggResults[key]
                .map(val => val[innerKey])
                .filter(val => !!val);
            // console.log('all', innerKey, allInnerKeyVals);
            innerAcc[innerKey] = avgArray(allInnerKeyVals);
            return innerAcc;
        }, {});
        return acc;
    }, {});




    // console.log(JSON.stringify(cheapBuys[cheapBuys.length - 1], null, 2));
    console.log(JSON.stringify(aggResults, null, 2));

};
