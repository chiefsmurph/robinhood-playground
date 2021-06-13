const Combinatorics = require('js-combinatorics');
const { MACD } = require('technicalindicators');
//[fast = 5, slow = 8, signal = 3]
const getMacd = (values, [fast = 12, slow = 26, signal = 9]) => {
    values = (values || []).filter(Boolean);
    const macdSeries = MACD.calculate({
        values,
        fastPeriod: fast,
        slowPeriod: slow,
        signalPeriod: signal,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
    if (!macdSeries || macdSeries.length < 2) {
        return {};
    }
    const [secondToLast, lastVal] = macdSeries.slice(-2);
    const bearishSignal = (
        secondToLast.MACD > secondToLast.signal &&
        lastVal.MACD < lastVal.signal
    );
    const isSignalCross = (
        secondToLast.MACD < secondToLast.signal &&
        lastVal.MACD > lastVal.signal
    );
    const signalGoingUp = secondToLast.signal < lastVal.signal;
    const isZeroCross = (
        (   // kst crossing zero
            secondToLast.MACD < 0 && 
            lastVal.MACD > 0
        ) &&
        (   // kst is above signal for both last and second to last
            lastVal.MACD > lastVal.signal &&
            secondToLast.MACD > secondToLast.signal
        )
    );
    const isLow = (() => {
        const isBelowZero = val => val < 0;
        const isBelowLowerQuarter = (() => {
            const macdVals = macdSeries
                .slice(-100)
                .map(({ MACD, signal }) => [MACD, signal])
                .flatten()
                .filter(Boolean)
            const max = Math.max(...macdVals);
            const min = Math.min(...macdVals);
            const diff = max - min;
            const lowQuarter = min + (diff * .3);
            // console.log({ min, max, diff, lowQuarter, lastVal, secondToLast})
            return val => val < lowQuarter;
        })();
        const bothTestsPass = val => [isBelowZero, isBelowLowerQuarter].every(
            test => test(val)
        );
        return [lastVal, secondToLast]
            .map(({ MACD, signal }) => [MACD, signal])
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
    //         macdSeries
    //     });
    // }
    return {
        macdSeries,
        isSignalCross,
        isZeroCross,
        isLow,
        bearishSignal,
        signalGoingUp
    };
};


const handleMACDConfig = macdConfig => allCurrents => {
    const { macdSeries, isSignalCross, isZeroCross, isLow, bearishSignal, signalGoingUp } = getMacd(allCurrents, macdConfig);
    return {
        keys: {
            ...signalGoingUp && {

                isSignalCross,
                isZeroCross,
                ...(isSignalCross || isZeroCross) && {
                    isLow,
                }
                
            },
            
            bearishSignal
        },
        data: {
            macdSeries,
        }
    };
};


module.exports = {
    disabled: true,
    period: [10, 30],
    collections: ['hotSt', 'holds'],
    handler: ({ allPrices }) => {
        const allCurrents = allPrices.map(obj => obj.currentPrice);
        const config = [5, 8, 3];
        return handleMACDConfig(config)(allCurrents);
    },
    pms: {

        ...Combinatorics.cartesianProduct(
            [
                'isSignalCross',
                'isZeroCross',
                'bearishSignal',
            ],
            [
                'notWatchout',
                'shouldWatchout',
            ],
            [
                'isLow'
            ],
            [
                'firstAlert'
            ],
            [
                'dinner',
                'lunch',
                'brunch',
                'initial'
            ]
        ).toArray().reduce((acc, arr) => {

            return {
                ...acc,
                ...Combinatorics.power(arr)
                .toArray()
                .filter(s => s && s.length)
                .reduce((inner, combo) => ({
                    ...inner,
                    [combo.join('-')]: combo
                }), {})
            }

        }, {}),


        signalCrosses: 'isSignalCross',
        zeroCrosses: 'isZeroCross',
        isLow: 'isLow',

        hothotBothZeroAndSignal: ['isSignalCross', 'isZeroCross'],

        shouldWatchout: 'shouldWatchout',
        notWatchout: 'notWatchout',

        firstAlerts: 'firstAlert',

        '30minute': '30min',
        '10minute': '10min',
        '5minute': '5min',

        options30minNotWatchout: ['options', '30min', 'notWatchout'],

        zeroAndOnezeroCrosses30Min: ['zeroAndOne', '30min', 'isZeroCross'],
        zeroAndOnesignalCrossesislow30Min: ['zeroAndOne', '30min', 'isSignalCross', 'isLow'],

        optionszeroCrosses30Min: ['options', '30min', 'isZeroCross'],
        optionszeroCrosses10Min: ['options', '10min', 'isZeroCross'],
        optionssignalCrossesislow30Min: ['options', '30min', 'isSignalCross', 'isLow'],


        // upcomingZeroCrosses: ['upcoming', '30min', 'isZeroCross'],
        // upcomingLowSignals: ['upcoming', '30min', 'isSignalCross', 'isLow'],

        top100ZeroCrosses: ['top100', 'isZeroCross'],
        top100ZeroCrosses30minUnder300: ['top100', 'under300', '30min', 'isZeroCross'],
        top100SignalCrosses30minUnder300: ['top100', 'under300', '30min', 'isSignalCross'],

        top100LowSignals10min: ['top100', '10min', 'isSignalCross', 'isLow'],
        top100LowSignals30min: ['top100', '30min', 'isSignalCross', 'isLow'],


        // post run 
        
        // precededByRSI5min: ['precededByRSI', '5min'],
        // precededByRSI10min: ['precededByRSI', '10min'],
        // precededByRSI30min: ['precededByRSI', '30min'],
        
    },

    // postRun: (newPicks, todaysPicks, periods) => {

    //     // precededByRSI
    //     // find tickers who in the last run triggered RSI
    //     // and are currently not RSI alerted
    //     // but are now KST alerted

    //     const postRunPicks = [];
    //     periods.forEach(period => {

    //         const todaysFilteredByPeriod = todaysPicks.filter(
    //             picks => picks.some(
    //                 pick => pick.period === period
    //             )
    //         );
            
    //         console.log('KST POSTRUN DEBUG...');
    //         // console.log({ period, todaysFilteredByPeriod: todaysFilteredByPeriod.length });
    //         const picksMatchingPeriod = (picks = []) => {
    //             return picks.filter(
    //                 pick => pick.period === period
    //             );
    //         };
    //         const relatedNewPicks = picksMatchingPeriod(newPicks);
    //         const relatedPreviousPicks = picksMatchingPeriod(todaysFilteredByPeriod.pop());
    //         const newKstAlerts = relatedNewPicks
    //             .filter(pick => pick.strategyName === 'kst');
    //         const filterByRsiTickers = (picks, ticker) => picks.filter(pick => 
    //             pick.ticker === ticker
    //             && pick.strategyName === 'rsi'
    //         );
    //         const withoutActiveRSI = newKstAlerts.filter(({ ticker }) => {
    //             const bothCurrentAndPrevPicks = [
    //                 ...relatedNewPicks,
    //                 ...todaysPicks.slice(-1),
    //             ];
    //             const filtered = filterByRsiTickers(bothCurrentAndPrevPicks, ticker);
    //             return !filtered.length;
    //         });
    //         // strlog({relatedPreviousPicks})
    //         let precededByRSI = withoutActiveRSI
    //             .map(kstAlert => ({
    //                 ...MACDAlert,
    //                 prevRsiPicks: filterByRsiTickers(relatedPreviousPicks, kstAlert.ticker)
    //             }))
    //             .filter(({ prevRsiPicks }) => prevRsiPicks.length);

    //         // console.log({
    //         //     newKstAlerts,
    //         //     withoutActiveRSI,
    //         //     precededByRSI
    //         // })
    //         precededByRSI.forEach(({ ticker, prevRsiPicks, keys }) => {
    //             postRunPicks.push({
    //                 ticker,
    //                 keys: {
    //                     precededByRSI: true,
    //                     [`${period}min`]: true,
    //                     ...keys
    //                 },
    //                 data: {
    //                     prevRsiPicks
    //                 }
    //             });
    //         });
    //     });

    //     return postRunPicks;
    // }
};