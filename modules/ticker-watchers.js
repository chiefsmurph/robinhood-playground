const allStocks = require('../json/stock-data/allStocks');
const HistoricalTickerWatcher = require('../socket-server/historical-ticker-watcher');

// app-actions
const recordPicks = require('../app-actions/record-picks');
const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');
const addFundamentals = require('../app-actions/add-fundamentals');

// rh-actions
const getRisk = require('../rh-actions/get-risk');

// utils
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const lookupMultiple = require('../utils/lookup-multiple');
const getTrend = require('../utils/get-trend');
const { isTradeable } = require('../utils/filter-by-tradeable');
const { avgArray } = require('../utils/array-math');
const sendEmail = require('../utils/send-email');
const regCronIncAfterSixThirty = require('../utils/reg-cron-after-630');

let tickerWatcher;
let relatedP;

const OPTIONSTICKERS = [
    'SPY',
    'GDX',
    'QQQ',
    'GLD',
    'VXX',


    'AAPL',
    'NFLX',
    'AMZN',
    'GOLD',
    'ABBV',
    'TXBA'
];

const getRhStocks = async rhTag => {
    console.log(`getting robinhood ${rhTag} stocks`);
    const {
        instruments: top100RHinstruments
    } = await Robinhood.url(`https://api.robinhood.com/midlands/tags/tag/${rhTag}/`);
    let top100RHtrend = await mapLimit(top100RHinstruments, 3, async instrumentUrl => {
        const instrumentObj = await Robinhood.url(instrumentUrl);
        return {
            ...instrumentObj,
            instrumentUrl,
            ticker: instrumentObj.symbol
        };
    });
    return top100RHtrend.map(t => t.ticker);
};


const onEnd = allPicks => {
    console.log(allPicks);
    allPicks = allPicks
        .map(jump => ({
            ...jump,
            finalPrice: relatedP[jump.ticker].pop().lastTradePrice
        }))
        .map(jump => ({
            ...jump,
            trend: getTrend(jump.finalPrice, jump.jumpPrice)
        }))
        .sort((a, b) => b.trendFromMin - a.trendFromMin);
    
    console.log('HERE');
    console.log(JSON.stringify(allPicks, null ,2))


    const avgTrend = avgArray(allPicks.map(j => j.trend));
    console.log({ avgTrend });
    allPicks.forEach(jump => console.log(jump));
    tickerWatcher.stop();
    tickerWatcher = null;
};



module.exports = {
    name: 'ticker-watchers',
    init: async () => {

        // setTimeout(async () => {
        //     console.log('recording based-on-jump-fourToEightOvernight-trending35257-gt500kvolume-first2-5');
        //     await recordPicks('based-on-jump-fourToEightOvernight-trending35257-gt500kvolume-first2', 5, ['BPMX']);
        // }, 10000);

        const handler = async relatedPrices => {
            // console.log({ relatedPrices });
            relatedP = relatedPrices;
            const newJumps = [];
            for (let key of Object.keys(relatedPrices)) {
                const allPrices = relatedPrices[key].map(obj => obj.lastTradePrice);
                const mostRecent = allPrices.pop();
                const min = Math.min(...allPrices);
                const trendFromMin = getTrend(mostRecent, min);
                const bigJump = trendFromMin < -5;
                // console.log({ min, trendFromMin })
                if (bigJump && allPrices.length >= 3) {
                    console.log('found big jump', key, mostRecent, allPrices);
                    newJumps.push({
                        ticker: key,
                        jumpPrice: mostRecent,
                        trendFromMin
                    });
                }
            }

            return newJumps;

        };
        
        tickerWatcher = new HistoricalTickerWatcher({
            name: 'ticker-watchers',
            handler,
            timeout: 60000 * 3, // 5 min,
            runAgainstPastData: false,
            onPick: async pick => {

                const { jumpPrice: price, ticker, trendFromMin } = pick;

                // check against 5 minute historical data???
                let [fiveMinuteHistoricals] = await getMultipleHistoricals(
                                        [ticker],
                    'interval=5minute&span=day'
                );
                fiveMinuteHistoricals = fiveMinuteHistoricals.map(o => o.close_price);
                const failedHistoricalCheck = fiveMinuteHistoricals.slice(0, -1).some(p => getTrend(p, price) < 5);
                const historicalKey = failedHistoricalCheck ? 'failedHistorical' : '';

                const { shouldWatchout } = await getRisk({ ticker });
                const jumpKey = (() => {
                    if (trendFromMin > -8) return 'minorJump';
                    if (trendFromMin < -13) return 'majorJump';
                })();
                const watchoutKey = shouldWatchout ? 'shouldWatchout' : 'notWatchout';
                const priceKeys = [1, 5, 10, 15, 20, 100];
                const priceKey = priceKeys.find(key => price < key);
                const min = getMinutesFromOpen();
                const minKey = (() => {
                    if (min > 390) return 'afterhours';
                    if (min > 200) return 'dinner';
                    if (min > 60) return 'lunch';
                    if (min > 3) return 'brunch';
                    if (min > 0) return 'initial';
                    return 'premarket'
                })();
                let fundamentals;
                try {
                    fundamentals = (await addFundamentals([{ ticker }]))[0].fundamentals;
                } catch (e) {}
                const { volume, average_volume } = fundamentals || {};
                const volumeKey = (() => {
                    if (volume > 1000000 || volume > average_volume * 3.5) return 'highVol';
                    if (volume < 10000) return 'lowVol';
                    return '';
                })();

                // const strategyName = `ticker-watchers-under${priceKey}${watchoutKey}${jumpKey}${minKey}${historicalKey}`;

                const strategyName = [
                    'ticker-watchers',
                    `under${priceKey}`,
                    watchoutKey,
                    jumpKey,
                    minKey,
                    historicalKey,
                    volumeKey
                ].filter(Boolean).join('-');

                await sendEmail(`NEW JUMP DOWN ${strategyName}: ${ticker}`, JSON.stringify(pick, null, 2));
                await recordPicks(strategyName, 5000, [ticker]);
            },
            onEnd
        });

        const getUnder15 = async () => {
            const tickPrices = await lookupMultiple(allStocks.filter(isTradeable).map(o => o.symbol));
            const allUnder15 = Object.keys(tickPrices).filter(ticker => tickPrices[ticker] < 20 && tickPrices[ticker] > 0);
            // console.log({ allUnder15 });
            return allUnder15;
        };

        regCronIncAfterSixThirty({
            name: `clear ticker-watchers price cache`,
            run: [-330],    // start of pre market
            fn: () => tickerWatcher.clearPriceCache()
        });

        const setTickers = async () => {
            // all under $15 and no big overnight jumps
            tickerWatcher.clearTickers();
            const under15 = await getUnder15();
            tickerWatcher.addTickers(under15);
            const upcoming = await getRhStocks('upcoming-earnings');
            tickerWatcher.addTickers(upcoming);
            const top100 = await getRhStocks('100-most-popular');
            tickerWatcher.addTickers(top100);
            tickerWatcher.addTickers(OPTIONSTICKERS);
            console.log({
                under15: under15.length,
                upcoming: upcoming.length,
                top100: top100.length,
                OPTIONSTICKERS: OPTIONSTICKERS.length
            });
        };

        regCronIncAfterSixThirty({
            name: `set ticker-watchers tickers`,
            run: [2],
            fn: setTickers
        });

        regCronIncAfterSixThirty({
            name: `stop ticker-watchers`,
            run: [500],
            fn: () => tickerWatcher.stop()
        });

        await setTickers();
        tickerWatcher.start();

    }
};



// module.exports = {
//     name: 'quick-drops',
//     crons: 

// }