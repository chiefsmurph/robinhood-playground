const fs = require('mz/fs');

const Pick = require('../models/Pick');
const StratPerf = require('../models/StratPerf');

const getTrend = require('../utils/get-trend');
const { avgArray } = require('../utils/array-math');
const jsonMgr = require('../utils/json-mgr');
const { filterByTradeable } = require('../utils/filter-by-tradeable');
const lookupMultiple = require('../utils/lookup-multiple');

const analyzeDay = async (day) => {

    // let files = await fs.readdir(`./json/picks-data/${day}`);
    console.log('analyzeDay');
    let pickObjs = await Pick.find({ date: day });
    console.log(`analyzing ${day}: ${pickObjs.length} strategies`);

    let tickerLookups = {};
    const strategyPicks = {};

    // load data from picks-data and keep track of tickers to lookup
    pickObjs.forEach(pickObj => {
        strategyPicks[`${pickObj.strategyName}-${pickObj.min}`] = pickObj;
        const tickers = pickObj.picks.map(p => p.ticker);
        tickers.forEach(t => {
            tickerLookups[t] = null;
        });
    });

    // lookup prices of all tickers (chunked)
    const tickersToLookup = Object.keys(tickerLookups);
    // console.log(tickersToLookup, 'feaf')

    tickerLookups = await lookupMultiple(tickersToLookup);

    // calc trend and avg for each strategy-min
    const withTrend = [];
    pickObjs.forEach(pickObj => {
        // console.log('handling', pickObj);
        const picks = pickObj.picks
            .filter(({ticker}) => filterByTradeable([ticker]).length);
        const picksWithTrend = picks.map(({ticker, price}) => ({
            ticker,
            thenPrice: price,
            nowPrice: tickerLookups[ticker],
            trend: getTrend(tickerLookups[ticker], price)
        }));
        withTrend.push({
            strategyName: pickObj.strategyName,
            min: pickObj.min,
            avgTrend: avgArray(picksWithTrend.map(pick => pick.trend)),
            picks: picksWithTrend.map(t => t.ticker).join(', ')
        });
    });
    // console.log(JSON.stringify(withTrend, null, 2));

    const sortedByAvgTrend = withTrend
        .filter(trend => trend.avgTrend)
        .sort((a, b) => b.avgTrend - a.avgTrend);

    // console.log(JSON.stringify(sortedByAvgTrend, null, 2));

    return sortedByAvgTrend;

};

module.exports = {
    analyzeDay,
    default: async (min) => {

        // console.log('running record')
        // console.log(min);
        const distinctDates = await Pick.find().distinct('date');
        // console.log({ distinctDates });
        // console.log(folders);

        let sortedFolders = distinctDates.sort((a, b) => {
            return new Date(a) - new Date(b);
        });


        // console.log(sortedFolders);

        const perms = {
            'same-day': 1,
            'next-day': 2,
            'second-day': 3,
            'third-day': 4,
            ...(min === 9 && {
                'fourth-day': 5
            })
        };

        for (let [key, daysBack] of Object.entries(perms)) {
            // console.log(key, daysBack);

            const pastDayDate = sortedFolders[sortedFolders.length - daysBack];
            if (!pastDayDate) {
                console.log(key, 'not enough picks-data to analyze within record-strat-perfs.');
                break;
            }
            const analyzed = await analyzeDay(pastDayDate);
            const period = `${key}-${min}`;
            console.log('done analyzing', pastDayDate, analyzed);
            analyzed.length && await StratPerf.bulkWrite(
                analyzed.map(stratPerf => ({
                    updateOne: {
                        filter: {
                            date: pastDayDate,
                            stratMin: `${stratPerf.strategyName}-${stratPerf.min}`
                        },
                        update: {
                            '$push': {
                                perfs: {
                                    period,
                                    avgTrend: stratPerf.avgTrend
                                }
                            }
                        },
                        upsert: true
                    }
                }))
            );
            console.log(key, 'saved strat-perf');
        };
        console.log('done saving strat-perfs!');
    }

};
