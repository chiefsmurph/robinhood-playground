const { RSI } = require('technicalindicators');

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


const getRSI = values => {
    return RSI.calculate({
        values,
        period: 14
    }) || [];
};

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

const getGroups = async () => {

    const getTickersBetween = async (min, max) => {
        const tickPrices = await lookupMultiple(allStocks.filter(isTradeable).map(o => o.symbol));
        const tickers = Object.keys(tickPrices).filter(ticker => tickPrices[ticker] < max && tickPrices[ticker] > min);
        console.log({ kstTickers: tickers });
        return tickers;
    };

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

    return {
        options: OPTIONSTICKERS,
        // zeroAndOne: await getTickersBetween(0, 1),
        upcoming: await getRhStocks('upcoming-earnings'),
        top100: await getRhStocks('100-most-popular'),
    };


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


let tickersAlerted = [];


module.exports = {
    name: 'rsi-watchers',
    init: async () => {

        let groups;
        const refreshGroups = async () => {
            groups = await getGroups();
        };


        const handler = async relatedPrices => {
            // console.log({ relatedPrices });
            relatedP = relatedPrices;
            const picks = [];
            for (let key of Object.keys(relatedPrices)) {
                const allPrices = relatedPrices[key].map(obj => obj.currentPrice);
                const mostRecent = allPrices[allPrices.length - 1];
                const rsiSeries = getRSI(allPrices);
                const rsi = rsiSeries[rsiSeries.length - 1];
                if (rsi < 30) {
                    picks.push({
                        ticker: key,
                        rsiSeries,
                        rsi,
                        allPrices,
                        price: mostRecent
                    });
                }
            }
            if (picks.length > 7) {
                console.log('WOAH WOAH THERE RSI-WATCHERS NOT SO FAST', picks.length);
                return picks.filter(pick => OPTIONSTICKERS.includes(pick.ticker));
            }
            return picks;
        };

        
        
        tickerWatcher = new HistoricalTickerWatcher({
            name: 'rsi-watchers',
            handler,
            timeout: 60000 * 15, // 5 min,
            runAgainstPastData: false,
            onPick: async pick => {

                const { ticker, rsi, price } = pick;

                const { shouldWatchout } = await getRisk({ ticker });
                const watchoutKey = shouldWatchout ? 'shouldWatchout' : 'notWatchout';
                const priceKeys = [10, 15, 20, 1000];
                const priceKey = priceKeys.find(key => price < key);
                const min = getMinutesFromOpen();
                const minKey = (() => {
                    if (min > 390) return 'afterhours';
                    if (min > 200) return 'dinner';
                    if (min > 60) return 'lunch';
                    if (min > 3) return 'brunch';
                    if (min > 0) return 'initial';
                    return 'premarket';
                })();
                const rsiKey = (() => {
                    const num = [10, 15, 20, 25, 30].find(val => rsi < val);
                    return num ? `rsilt${num}` : 'fluke';
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

                const firstAlertkey = !tickersAlerted.includes(ticker) ? 'firstAlert' : '';

                // const strategyName = `ticker-watchers-under${priceKey}${watchoutKey}${jumpKey}${minKey}${historicalKey}`;

                const strategyName = [
                    'rsi-watchers',
                    `under${priceKey}`,
                    rsiKey,
                    firstAlertkey,
                    watchoutKey,
                    minKey,
                    volumeKey
                ].filter(Boolean).join('-');

                await sendEmail(`NEW RSI ALERT ${strategyName}: ${ticker}`, JSON.stringify(pick, null, 2));
                await recordPicks(strategyName, 5000, [ticker]);
                tickersAlerted.push(ticker);
            },
            onEnd
        });

        regCronIncAfterSixThirty({
            name: `clear rsi-watchers price cache`,
            run: [-330, 0],    // start of pre market
            fn: () => tickerWatcher.clearPriceCache()
        });

        const setTickers = async () => {
            tickerWatcher.clearTickers();
            await refreshGroups();
            Object.keys(groups).forEach(group => {
                const tickers = groups[group];
                tickerWatcher.addTickers(tickers);
            });
            tickersAlerted = [];

            console.log('rsi', groups);
        };

        regCronIncAfterSixThirty({
            name: `set rsi-watchers tickers`,
            run: [2],
            fn: setTickers
        });

        regCronIncAfterSixThirty({
            name: `stop rsi-watchers`,
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