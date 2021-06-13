// utils
const getTrend = require('../utils/get-trend');

// app-actions
const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');

// const mapLimit = require('promise-map-limit');

const trendFilter = async (trend) => {

    let allHistoricals = await getMultipleHistoricals(
        trend.map(buy => buy.ticker)
    );

    const withHistoricals = trend.map((buy, i) => ({
        ...buy,
        historicals: allHistoricals[i]
    }));

    const ofInterest = withHistoricals
        .filter(({ historicals }) => historicals.length)
        .map(buy => {

            const { historicals } = buy;
            historicals.reverse();

            const mostRecentHistDate = new Date(historicals[0].begins_at);
            mostRecentHistDate.setDate(mostRecentHistDate.getDate() + 1);
            const todaysDate = new Date();
            if (todaysDate.getHours() < 6) {
                todaysDate.setDate(todaysDate.getDate() - 1);
            }
            // const todayInHistoricals = mostRecentHistDate.getDate() === todaysDate.getDate();
            // console.log(todayInHistoricals, 'today in')
            // let mostRecentTrend;
            // if (!todayInHistoricals) {
            //     // daytime
            //     mostRecentTrend = buy.trend_since_prev_close;
            // } else {
            //     // evening
            //     mostRecentTrend = historicals.shift().trend;
            // }

            let mostRecentTrend = historicals.shift().trend;

            return {
                ...buy,
                mostRecentTrend
            };
        })
        .filter(({mostRecentTrend}) => mostRecentTrend > 1 && mostRecentTrend < 6)
        .map(buy => {
            let daysDown = [];
            buy.historicals.some(hist => {
                const wentUp = hist.trend < 0;
                daysDown.push(hist);
                return !wentUp;
            });
            delete buy.historicals;
            // delete buy.fundamentals;
            // delete buy.quote_data;
            const daysDownCount = daysDown.length - 1;
            if (daysDownCount) {
                try {
                    var percDown = getTrend(daysDown[0].close_price, daysDown[daysDown.length - 1].close_price);
                    var points = daysDownCount * Math.abs(percDown) * buy.mostRecentTrend;
                } catch (e) {}
            }
            return {
                ...buy,
                daysDownCount,
                daysDown,
                percDown,
                points
            };
        })
        .filter(buy => buy.daysDownCount > 0 && Math.abs(buy.percDown) > buy.mostRecentTrend)
        .sort((a, b) => b.points - a.points);

    const num = n => ofInterest
        .slice(0, n)
        .map(buy => buy.ticker);
    // console.log(JSON.stringify(ofInterest));
    return {
        count1: num(1),
        count2: num(2),
        count10: num(10),
    };
};

const firstGreens = {
    name: 'first-greens',
    trendFilter,
    // run: [12, 190, 250, 600, -15],
};

module.exports = firstGreens;
