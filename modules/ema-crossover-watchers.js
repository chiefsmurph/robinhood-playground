let tickerWatcher;
const cacheThis = require('../utils/cache-this');
const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');
const addFundamentals = require('../app-actions/add-fundamentals');

const tickerAnalysis = {};

// const cachedHistorical = cacheThis()
const recordPicks = require('../app-actions/record-picks');
const allStocks = require('../json/stock-data/allStocks');
const HistoricalTickerWatcher = require('../socket-server/historical-ticker-watcher');
const lookupMultiple = require('../utils/lookup-multiple');
const { isTradeable } = require('../utils/filter-by-tradeable');
const { SMA, EMA } = require('technicalindicators');
const getTrend = require('../utils/get-trend');
const { avgArray } = require('../utils/array-math');
const regCronIncAfterSixThirty = require('../utils/reg-cron-after-630');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const sendEmail = require('../utils/send-email');

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


const calcEMA = (period, obj, lastVal) => {
    const array = EMA.calculate({
        period,
        values: [
            ...obj.yearHistoricals.map(hist => hist.close_price),
            ...lastVal ? [Number(lastVal)] : []
        ]
    });
    return array.pop();
};
const smaTrendingUp = (obj, lastVal) => {
    const array = SMA.calculate({
        period: 180,
        values: [
            ...obj.yearHistoricals.map(hist => hist.close_price),
            ...lastVal ? [Number(lastVal)] : []
        ]
    });
    const fiveDaysAgo = array[array.length - 6];
    const recent = array[array.length - 1];
    return recent > fiveDaysAgo;
};


module.exports = {
    name: 'ema-crossover-watchers',
    disableinit: async () => {

        tickerWatcher = new HistoricalTickerWatcher({
            name: 'ema-crossover-watchers',
                        handler: async relatedPrices => {
                const picks = [];
                for (let ticker of Object.keys(relatedPrices)) {

                    const analysis = tickerAnalysis[ticker];
                    const allPrices = relatedPrices[ticker].map(obj => obj.lastTradePrice);
                    const mostRecent = allPrices.pop();
                    const open35ema = analysis.open.ema35;
                    const new5ema = calcEMA(
                        5,
                        analysis,
                        mostRecent
                    );
                    if (new5ema > open35ema && !tickerAnalysis[ticker].traveledAbove) {
                        console.log('hittt it');
                        tickerAnalysis[ticker].traveledAbove = true;
                        const data = {
                            ticker,
                            crossPrice: mostRecent,
                            new5ema,
                            open35ema,
                            aboveCount: tickerAnalysis[ticker].aboveCount,
                            sma180trendingUp: analysis.sma180trendingUp
                        };
                        picks.push(data);
                        console.log(data)
                    }
                }
                return picks.length > 4 ? [] : picks;
            },
            timeout: 60000 * 4, // 5 min,
            runAgainstPastData: false,
            onPick: async pick => {
                console.log('onPick');
                const { ticker } = pick;
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
                const { sma180trendingUp } = tickerAnalysis[ticker];
                const sm180key = sma180trendingUp ? 'sma180trendingUp' : '';
                const strategyName = [
                    'ema-crossover-watchers',
                    minKey,
                    sm180key,
                    volumeKey
                ].filter(Boolean).join('-');
                await sendEmail(`NEW EMA CROSSOVER ${strategyName}: ${ticker}`, JSON.stringify(pick, null, 2));
                await recordPicks(strategyName, 5000, [ticker]);
            },
            onEnd: async allPicks => {
                console.log(allPicks);
                const ls = await lookupMultiple(allPicks.map(p => p.ticker));
                const withAnalysis = allPicks.map(pick => ({
                    ...pick,
                    trendSincePick: getTrend(ls[pick.ticker], pick.crossPrice)
                }))
                console.log(withAnalysis.sort((a, b) => b.trendSincePick - a.trendSincePick));
                const avg = avgArray(withAnalysis.map(o => o.trendSincePick));
                console.log(avg)
            }
        });

        const getUnder15 = async () => {
            const tickPrices = await lookupMultiple(allStocks.filter(isTradeable).map(o => o.symbol));
            const allUnder15 = Object.keys(tickPrices).filter(ticker => tickPrices[ticker] < 20 && tickPrices[ticker] > 0.3);
            console.log({ allUnder15 });
            return allUnder15;
        };

        const setTickers = async () => {
            // all under $15 and no big overnight jumps
            tickerWatcher.clearTickers();

            const under15 = await getUnder15();
            const trend = under15.map(ticker => ({ ticker }));
            const withOvernightJump = await addFundamentals(trend);


            const withYearHistoricals = await addTrendWithHistoricals(
                withOvernightJump,  
                'day', 
                'year'
            );

            

            const withEMA = withYearHistoricals.map(o => ({
                ...o,
                sma180trendingUp: smaTrendingUp(o, o.fundamentals.open),
                open: {
                    ema35: calcEMA(35, o, o.fundamentals.open),
                    ema5: calcEMA(5, o, o.fundamentals.open),
                },
            }));

            const startingBelow35Ema = withEMA.filter(o => 
                o.open.ema5 < o.open.ema35
            );

            startingBelow35Ema.forEach(o => {
                tickerAnalysis[o.ticker] = o;
            });
        
            // str(withEMA)
            console.log('starting below 35day ema', startingBelow35Ema.map(t => t.ticker))

            const sma180trending = startingBelow35Ema.filter(o => o.sma180trendingUp);
            console.log(withEMA.length, startingBelow35Ema.length, sma180trending.length )

            tickerWatcher.addTickers(startingBelow35Ema.map(o => o.ticker));
        };

        regCronIncAfterSixThirty({
            name: `set ema-crossover-watchers tickers (< $15)`,
            run: [2],
            fn: setTickers
        });

        regCronIncAfterSixThirty({
            name: `stop ema-crossover-watchers`,
            run: [440],
            fn: () => tickerWatcher.stop()
        });

        await setTickers();
        tickerWatcher.start();
    }
}