// utils
const getUpStreak = require('../app-actions/get-up-streak');
const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');
const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');
const getTrend = require('../utils/get-trend');
const { avgArray } = require('../utils/array-math');

const mapLimit = require('promise-map-limit');

const trendFilter = async (trend) => {

    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const todaysDay = days[(new Date()).getDay()];
    console.log('todays day', todaysDay);

    let returnArr = await addOvernightJumpAndTSO(trend);

    // var allTickers = require('../json/stock-data/allStocks');
    // allTickers = allTickers
    //     .filter(stock => stock.tradeable)
    //     .map(stock => stock.symbol);


    // console.log('getting historicals', cheapBuys);

    let allHistoricals = await getMultipleHistoricals(
        returnArr.map(buy => buy.ticker)
    );

    let withHistoricals = returnArr.map((buy, i) => ({
        ...buy,
        historicals: allHistoricals[i]
    }));

    let curIndex = 0;
    withHistoricals = await mapLimit(withHistoricals, 20, async buy => {

        if (curIndex % Math.floor(withHistoricals.length / 10) === 0) {
            console.log('historical', curIndex, 'of', withHistoricals.length);
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
                dow: days[ (new Date(hist.begins_at)).getDay() + 1 ],
                trend: getTrend(hist.close_price, hist.open_price),
                upstreak
            };

        });

        // console.log(historicals,'hist');

        return {
            ...buy,
            historicals,
            dowAgg: days.map(day => {
                const matches = historicals.filter(hist =>
                    hist.dow === day &&
                    hist.upstreak > 1
                );
                return {
                    ticker: buy.ticker,
                    day,
                    count: matches.length,
                    percUp: matches.filter(b => Number(b.trend) > 0).length / matches.length,
                    avgToday: avgArray(matches.map(m => Number(m.trend))),
                    // trends: matches.map(m => Number(m.trend))
                    // matches
                };
            })
        };

    });


    // sort by stock percUp

    let onlyAggs = [].concat.apply(
        [],
        withHistoricals.map(buy => buy.dowAgg)
    )
        .filter(agg => agg.percUp && agg.avgToday && agg.count > 5)
        .filter(agg => agg.day === todaysDay);

    let sortedByPercUp = onlyAggs
        .sort((a, b) => b.percUp - a.percUp)
        .slice(0, 15)
        .map(agg => agg.ticker);

    let sortedByAvgToday = onlyAggs
        .sort((a, b) => b.avgToday - a.avgToday)
        .slice(0, 15)
        .map(agg => agg.ticker);

    return {
        sortedByAvgToday,
        sortedByAvgTodayUno: sortedByAvgToday.slice(0, 1),
        sortedByAvgTodayDos: sortedByAvgToday.slice(0, 2),

        sortedByPercUp,
        sortedByPercUpUno: sortedByPercUp.slice(0, 1),
        sortedByPercUpDos: sortedByPercUp.slice(0, 2),
    };
};

const dowHistorical = {
    name: 'dow-historical',
    trendFilter,
    // run: [13, 73, 196],
};

module.exports = dowHistorical;
