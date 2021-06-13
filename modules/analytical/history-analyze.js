const { mapObject, omit } = require('underscore');

// utils
const getTrend = require('../../utils/get-trend');
const { avgArray, percUp } = require('../../utils/array-math');

// app-actions
const getMultipleHistoricals = require('../../app-actions/get-multiple-historicals');



const strategy = require('./strategy');





module.exports = {
    trendFilter: async (trend) => {

        const addTrendWithHistoricals = async (trend, interval, span) => {
            // add historical data
            let allHistoricals = await getMultipleHistoricals(
                trend.map(buy => buy.ticker),
                `interval=${interval}&span=${span}`
            );
    
            let withHistoricals = trend.map((buy, i) => ({
                ...buy,
                [`${span}Historicals`]: allHistoricals[i]
            }));
    
            return withHistoricals;
        };

        const trendWithHistoricals = (await addTrendWithHistoricals(trend, 'day', 'year'))
            .filter(buy => buy.yearHistoricals && buy.yearHistoricals.length);
            




        const UPPER_BOUND = 9;
        const LOWER_BOUND = -4;
        const MAX_DAY_AGE = 3;

        const NUM_DAYS_BACK = 10;

        str({
            UPPER_BOUND,
            LOWER_BOUND,
            MAX_DAY_AGE,
            NUM_DAYS_BACK
        });

        const daysBackArray = [...Array(NUM_DAYS_BACK).keys()].slice(1);


        const pureStratResults = await mapLimit(daysBackArray, 1, async daysBack => ({
            daysBack,
            data: await strategy(trendWithHistoricals, daysBack, ['', 'yesterdayDown'])
        }));

        const stratResults = pureStratResults.reduce((acc, { daysBack, data }) => ({
            ...acc,
            [daysBack]: data
        }), {});


        const analyzed = mapObject(
            stratResults, 
            (pastPickObj, daysBack) => mapObject(
                pastPickObj,
                picks => picks.map(ticker => {
                    const historicalsSince = trendWithHistoricals.find(buy => buy.symbol === ticker).yearHistoricals.slice(0 - Number(daysBack) - 1);
                    const prevClose = historicalsSince[0].close_price;
                    

                    const firstDay = historicalsSince[1];
                    // const hit2Down1stDay = getTrend(firstDay.low_price, prevClose) < -2;
                    // const startingPrice = hit2Down1stDay ? prevClose * 0.98 : prevClose;

                    const openedDown = firstDay.open_price > prevClose;
                    // if (openedDown) {
                    //     return {
                    //         openedDown: false
                    //     };
                    // }

                    const startingPrice = firstDay.open_price;
                    let endPrice, i = 0;
                    while (!endPrice) {
                        const { low_price, high_price, close_price, trend } = historicalsSince[++i];
                        if (getTrend(low_price, startingPrice) < LOWER_BOUND && i > 2) {
                            endPrice = startingPrice * (100 + LOWER_BOUND) / 100;
                        } else if (getTrend(high_price, startingPrice) > UPPER_BOUND) {
                            endPrice = startingPrice * (100 + UPPER_BOUND) / 100;
                        // } else if (historicalsSince[i] && getTrend(close_price, historicalsSince[i].close_price) < -2) {
                        //     console.log('dropped 2', ticker, historicalsSince[i].begins_at)
                        //     endPrice = historicalsSince[i].close_price * 0.98;
                        } else if (i === historicalsSince.length - 1 || i > MAX_DAY_AGE) {
                            endPrice = close_price;
                        }
                    }
                    return {
                        ticker,
                        startingPrice,
                        endPrice,
                        trend: getTrend(endPrice, startingPrice),
                        daysHeld: i - 1,
                        openedDown: true
                    };
                })
            )
        );

        
        let groupedByKey = {};
        Object.keys(analyzed).forEach(daysBack => {

            Object.keys(analyzed[daysBack]).forEach(key => {

                const picks = analyzed[daysBack][key];
                const trends = picks.map(pick => pick.trend);
                groupedByKey[key] = (groupedByKey[key] || []).concat({
                    daysBack: Number(daysBack),
                    picks,
                    trends: trends,
                    avgTrend: avgArray(
                        trends
                    ),
                    daysHeld: picks.map(pick => pick.daysHeld)
                });


            });

        });

        const perf = mapObject(
            groupedByKey,
            // pick(groupedByKey, val => val[0].picks.length === 1),
            perfObjs => {
                const perfs = perfObjs.map(perfObj => perfObj.avgTrend);
                const daysHeld = perfObjs.map(perfObj => perfObj.daysHeld);
                const returnObj = {
                    perfs,
                    avgPerf: avgArray(perfs),
                    percUp: percUp(perfs),
                    avgDaysHeld: avgArray(flatten(daysHeld)),
                    trends: flatten(perfObjs.map(perfObj => perfObj.trends))
                };
                return {
                    ...returnObj,
                    score: returnObj.avgPerf * returnObj.percUp
                };
            }
        );

        const topPerfs = Object.keys(perf)
            .sort((a, b) => perf[b].score - perf[a].score)
            .filter(key => perf[key].avgPerf > 0.5);

        console.table(
            topPerfs.map(key => ({
                perf: key,
                ...mapObject(
                    omit(perf[key], 'perfs'),
                    val => Array.isArray(val) ? val.map(twoDec) : twoDec(val)
                )
            }))
        );
        // str(stratResults)

    }
};