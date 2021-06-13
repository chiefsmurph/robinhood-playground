const { KST } = require('technicalindicators');

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


const getKST = (values, ticker) => {
    values = (values || []).filter(Boolean);
    const kstCalced = KST.calculate({
        values,
        ROCPer1: 17,
        ROCPer2: 12,
        ROCPer3: 20,
        ROCPer4: 25,
        SMAROCPer1: 6,
        SMAROCPer2: 5,
        SMAROCPer3: 1,
        SMAROCPer4: 1,
        signalPeriod: 8
    });
    if (!kstCalced || kstCalced.length < 2) {
        return {};
    }
    const [secondToLast, lastVal] = kstCalced.slice(-2);
    const isSignalCross = (
        secondToLast.kst < secondToLast.signal &&
        lastVal.kst > lastVal.signal
    );
    const isZeroCross = (
        secondToLast.kst < 0 &&
        lastVal.kst > 0
    );
    const isLow = (() => {
        const isBelowZero = val => val < 0;
        const isBelowLowerQuarter = (() => {
            const kstVals = kstCalced
                .map(({ kst, signal }) => [kst, signal])
                .filter(Boolean)
            const max = Math.max(...kstVals);
            const min = Math.min(...kstVals);
            const diff = max - min;
            const lowQuarter = min + (diff * .3);
            console.log({ min, max, diff, lowQuarter, lastVal, secondToLast})
            return val => val < lowQuarter;
        })();
        const bothTestsPass = val => [isBelowZero, isBelowLowerQuarter].every(
            test => test(val)
        );
        return [lastVal, secondToLast]
            .map(({ kst, signal }) => [kst, signal])
            .flatten()
            .every(bothTestsPass)
    })();
    // if (isSignalCross || isZeroCross) {
    //     console.log({
    //         values,
    //         ticker,
    //         secondToLast,
    //         lastVal,
    //         isSignalCross,
    //         isZeroCross,
    //         isLow,
    //         kstCalced
    //     });
    // }
    return {
        isSignalCross,
        isZeroCross,
        isLow
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
    name: 'kst-watchers',
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
                const mostRecent = allPrices.pop();
                const { isSignalCross, isZeroCross, isLow } = getKST(allPrices, key);
                if (isSignalCross || isZeroCross) {
                    picks.push({
                        ticker: key,
                        isSignalCross,
                        isZeroCross,
                        isLow,
                        price: mostRecent,
                        allPrices
                    });
                }
            }
            if (picks.length > 5) {
                console.log(picks);
                console.log('WOAH WOAH THERE KST-WATCHERS NOT SO FAST', picks.length);
                picks.forEach(pick => {
                    console.log(pick);
                }); 
                return picks.filter(pick => 
                    OPTIONSTICKERS.includes(pick.ticker)
                    || pick.isLow
                );
            }
            return picks;
        };
        
        tickerWatcher = new HistoricalTickerWatcher({
            name: 'kst-watchers',
            handler,
            timeout: 60000 * 10, // minutes
            runAgainstPastData: false,
            onPick: async pick => {

                const { ticker, isSignalCross, isZeroCross, isLow, price } = pick;

                const { shouldWatchout } = await getRisk({ ticker });
                const watchoutKey = shouldWatchout ? 'shouldWatchout' : 'notWatchout';
                const groupKey = Object.keys(groups).find(group =>
                    groups[group].includes(ticker)
                );
                const priceKeys = [1, 5, 10, 15, 20, 1000];
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
                const kstKeys = [
                    isSignalCross ? 'signalCross' : '',
                    isZeroCross ? 'zeroCross' : ''
                ].filter(Boolean).join('-');
                const isLowKey = isLow ? 'isLow': '';
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
                    'kst-watchers',
                    groupKey,
                    `under${priceKey}`,
                    kstKeys,
                    isLowKey,
                    firstAlertkey,
                    watchoutKey,
                    minKey,
                    volumeKey
                ].filter(Boolean).join('-');

                await sendEmail(`NEW KST ALERT ${strategyName}: ${ticker}`, JSON.stringify(pick, null, 2));
                await recordPicks(strategyName, 5000, [ticker]);
                tickersAlerted.push(ticker);
            },
            onEnd
        });

        

        regCronIncAfterSixThirty({
            name: `clear ticker-watchers price cache`,
            run: [-330, 0],    // start of pre market
            fn: () => tickerWatcher.clearPriceCache()
        });

        const setTickers = async () => {
            // all under $15 and no big overnight jumps
            tickerWatcher.clearTickers();
            await refreshGroups();
            Object.keys(groups).forEach(group => {
                const tickers = groups[group];
                tickerWatcher.addTickers(tickers);
            });
            tickersAlerted = [];

            console.log('kst', groups);
        };

        regCronIncAfterSixThirty({
            name: `set kst-watchers tickers`,
            run: [2],
            fn: setTickers
        });

        regCronIncAfterSixThirty({
            name: `stop kst-watchers`,
            run: [500],
            fn: () => tickerWatcher.stop()
        });

        await setTickers();
        tickerWatcher.start();

    }
};