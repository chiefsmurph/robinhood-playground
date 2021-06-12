const getFinvizCollections = require('./get-finviz-collections');
const getStockInvestCollections = require('./get-stockinvest-collections');
const getRisk = require('../../rh-actions/get-risk');
const addFundamentals = require('../../app-actions/add-fundamentals');
const runScan = require('../../scans/base/run-scan');
const hotSt = require('../../scans/hot-st');
const nowheres = require('../../scans/nowheres');
// const droppers = require('../../scans/droppers');

const getMinutesFromOpen = require('../../utils/get-minutes-from-open');
const allStocks = require('../../json/stock-data/allStocks');
const lookupMultiple = require('../../utils/lookup-multiple');
const { isTradeable } = require('../../utils/filter-by-tradeable');
const { mapObject, uniq } = require('underscore');

const { alpaca } = require('../../alpaca');

let holds = [];

const OPTIONSTICKERS = [

    'SPY',  // NOPE!


    'GDX',
    'QQQ',
    'GLD',
    // 'VXX',

    'ROKU',
    'AMD',
    'SQ',
    'AAPL',
    // 'NFLX',
    'AMZN',
    'GOLD',
    'SBUX',
    'BAC',


    'GM',
];


// const filterForTheGood = async tickers => {

//     const withFundamentals = await addFundamentals(
//         tickers
//             .filter(ticker => !OPTIONSTICKERS.includes(ticker))
//             .map(ticker => ({ ticker }))
//     );

//     console.log({ withFundamentals: withFundamentals.length})

//     const topVol = withFundamentals
//         .sort((a, b) => b.fundamentals.volume - a.fundamentals.volume)
//         .cutBottom();

//     console.log({ topVol: topVol.length})
    
//     const withVolToAvg = topVol
//         .map(obj => ({
//             ...obj,
//             volToAvg: obj.fundamentals.volume / obj.fundamentals.average_volume
//         }))
//         .filter(obj => obj.volToAvg)
//         .sort((a, b) => b.volToAvg - a.volToAvg)
//         .cutBottom();

//     console.log({ withVolToAvg: withVolToAvg.length});
    
//     // const sortedByMarketCap = withVolToAvg
//     //     .sort((a, b) => b.fundamentals.market_cap - a.fundamentals.market_cap)
//     //     .cutBottom();

//     // strlog({sortedByMarketCap: sortedByMarketCap.length});



//     let i = 0;
//     const withRisk = await mapLimit(withVolToAvg, 5, async obj => {
//         const response = {
//             ...obj,
//             ...await getRisk({ ticker: obj.ticker })
//         };
//         console.log(++i, '/', withVolToAvg.length );
//         return response;
//     });

//     const sortedBySumMostRecent = withRisk
//         // .filter(obj => obj.sumMostRecent > 0)
//         .sort((a, b) => b.sumMostRecent - a.sumMostRecent)
//         .cutBottom();

//     console.log({ sortedBySumMostRecent: sortedBySumMostRecent.length})

//     const theGoodStuff = sortedBySumMostRecent.map(obj => obj.ticker);
//     return theGoodStuff;
// }



export default async () => {

    console.log('get collections!');

    // const getTickersBetween = async (min, max) => {
    //     const tickPrices = await lookupMultiple(allStocks.filter(isTradeable).map(o => o.symbol));
    //     const tickers = Object.keys(tickPrices).filter(ticker => tickPrices[ticker] < max && tickPrices[ticker] > min);
    //     // console.log({ kstTickers: tickers });
    //     return tickers;
    // };

    // const getRhStocks = async rhTag => {
    //     console.log(`getting robinhood ${rhTag} stocks`);
    //     const {
    //         instruments: top100RHinstruments
    //     } = await Robinhood.url(`https://api.robinhood.com/midlands/tags/tag/${rhTag}/`);
    //     let top100RHtrend = await mapLimit(top100RHinstruments, 3, async instrumentUrl => {
    //         const instrumentObj = await Robinhood.url(instrumentUrl);
    //         return {
    //             ...instrumentObj,
    //             instrumentUrl,
    //             ticker: instrumentObj.symbol
    //         };
    //     });
    //     return top100RHtrend.map(t => t.ticker);
    // };

    holds = [
        ...holds,
        ...(await alpaca.getPositions()).map(pos => pos.symbol)
    ].uniq();
    
    let collections = mapObject(
        {
            holds,
            spy: ['SPY'],
            // options: OPTIONSTICKERS,
        }, 
        arr => arr.map(ticker => ({ ticker }))
    );

    const scans = {
        fitty: {
            minPrice: 0.20,
            maxPrice: 0.60,
            minVolume: 200000
        },

        lowVolFitty: {
            minPrice: 0,
            maxPrice: 0.60,
            maxVolume: 200000
        },

        zeroToOne: {
            minPrice: 0,
            maxPrice: 1,
            minVolume: 120000,
        },

        oneToTwo: {
            minPrice: 1,
            maxPrice: 2,
            minVolume: 45000
        },

        twoToFive: {
            minPrice: 2,
            maxPrice: 5,
            minVolume: 150000,
            count: 400,
        },

        fiveToTen: {
            minPrice: 5,
            maxPrice: 10,
            minVolume: 100000,
            count: 400,
        },

    };

    const getTicks = () => 
        Object.values(collections).flatten().map(t => t.ticker).uniq();


    // collections['droppers'] = (await droppers({
    //     minPrice: 0.1,
    //     maxPrice: 8,
    //     count: 25,
    //     includeStSent: false,
    //     excludeTickers: getTicks(),
    //     afterHoursReset: false
    // })).map(t => t.ticker);;

    console.log('get hotSt')

    collections.hotSt = await hotSt({
        minPrice: 0.1,
        maxPrice: 12,
        count: 80,
        includeStSent: false,
        excludeTickers: getTicks(),
        afterHoursReset: false
    });

    collections.nowheres = await nowheres({
        minPrice: 0.1,
        maxPrice: 12,
        count: 50,
        includeStSent: false,
        excludeTickers: getTicks(),
        afterHoursReset: false
    });

    console.log("other scans")
    for (let scanName of Object.keys(scans)) {
        console.log("scanName", scanName)
        const scan = scans[scanName];
        collections[scanName] = await runScan({
            minVolume: 50000,
            count: 260,
            ...scan,
            includeStSent: false,
            excludeTickers: getTicks(),
            afterHoursReset: false
            // minDailyRSI: 45
        });
    };



    /// CALCULATE THE STUFF BASED ON THE OTHER STUFF PLEASE!



    // strlog({ hey: collections.hotSt });

    // collections.movers = collections.hotSt
    //     .filter(t => t.computed.dailyRSI < 70)
    //     .sort((a, b) => b.computed.tso - a.computed.tso)
    //     .slice(0, 3);


    

        // lowVolumeTrash: (await runScan({
        //     minPrice: 1,
        //     maxPrice: 10,
        //     count: 120,
        //     includeStSent: false,
        //     minVolume: 20000,
        //     maxVolume: 90000,
        // })).map(t => t.ticker),
        
        // upcoming: await getRhStocks('upcoming-earnings'),
        // rhtop100: await getRhStocks('100-most-popular'),
        // ...await getFinvizCollections(),
        // ...await getStockInvestCollections()
    // };


    strlog(mapObject(collections, v => v.length));
    console.log(`only the good stuff: ${getTicks().length}`);


    // const withWatchout = await mapLimit(getTicks(), 5, async ticker => {
    //     const risk = await getRisk({ ticker });
    //     console.log('with', ticker, risk)
    //     return {
    //         ticker,
    //         shouldWatchout: risk.shouldWatchout
    //     };
    // });

    // const onlyWatchout = withWatchout
    //     .filter(({ shouldWatchout }) => shouldWatchout)
    //     .map(({ ticker }) => ticker);

    // collections = mapObject(
    //     collections, 
    //     tickers => (tickers || []).filter(ticker => 
    //         !onlyWatchout.includes(ticker)
    //     )
    // );

    // collections.shouldWatchout = onlyWatchout;

    return collections;

};