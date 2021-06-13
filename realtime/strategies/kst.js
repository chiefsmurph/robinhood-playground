const { KST } = require('technicalindicators');

const getKST = (values, ticker) => {
    values = (values || []).filter(Boolean);
    const kstSeries = KST.calculate({
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
    if (!kstSeries || kstSeries.length < 2) {
        return {};
    }
    const [secondToLast, lastVal] = kstSeries.slice(-2);
    const bearishSignal = (
        secondToLast.kst > secondToLast.signal &&
        lastVal.kst < lastVal.signal
    );
    const isSignalCross = (
        secondToLast.kst < secondToLast.signal &&
        lastVal.kst > lastVal.signal
    );
    const signalGoingUp = secondToLast.signal < lastVal.signal;
    const isZeroCross = (
        (   // kst crossing zero
            secondToLast.kst < 0 && 
            lastVal.kst > 0
        ) &&
        (   // kst is above signal for both last and second to last
            lastVal.kst > lastVal.signal &&
            secondToLast.kst > secondToLast.signal
        )
    );
    const isLow = (() => {
        const isBelowZero = val => val < 0;
        const isBelowLowerQuarter = (() => {
            const kstVals = kstSeries
                .slice(-100)
                .map(({ kst, signal }) => [kst, signal])
                .flatten()
                .filter(Boolean)
            const max = Math.max(...kstVals);
            const min = Math.min(...kstVals);
            const diff = max - min;
            const lowQuarter = min + (diff * .3);
            // console.log({ min, max, diff, lowQuarter, lastVal, secondToLast})
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
    //         kstSeries
    //     });
    // }
    return {
        kstSeries,
        isSignalCross,
        isZeroCross,
        isLow,
        bearishSignal,
        signalGoingUp
    };
};


module.exports = {
    period: [10, 30],
    collections: ['hotSt'],
    disabled: true,
    handler: async ({ ticker, allPrices }) => {
        const allCurrents = allPrices.map(obj => obj.currentPrice);
        const { kstSeries, isSignalCross, isZeroCross, isLow, bearishSignal, signalGoingUp } = getKST(allCurrents, ticker);
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
                kstSeries,
            }
        };
    },
    pms: {
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
        
        precededByRSI5min: ['precededByRSI', '5min'],
        precededByRSI10min: ['precededByRSI', '10min'],
        precededByRSI30min: ['precededByRSI', '30min'],
        
    },

    postRun: (newPicks, todaysPicks, periods) => {

        // precededByRSI
        // find tickers who in the last run triggered RSI
        // and are currently not RSI alerted
        // but are now KST alerted

        const postRunPicks = [];
        periods.forEach(period => {

            const todaysFilteredByPeriod = todaysPicks.filter(
                picks => picks.some(
                    pick => pick.period === period
                )
            );
            
            console.log('KST POSTRUN DEBUG...');
            // console.log({ period, todaysFilteredByPeriod: todaysFilteredByPeriod.length });
            const picksMatchingPeriod = (picks = []) => {
                return picks.filter(
                    pick => pick.period === period
                );
            };
            const relatedNewPicks = picksMatchingPeriod(newPicks);
            const relatedPreviousPicks = picksMatchingPeriod(todaysFilteredByPeriod.pop());
            const newKstAlerts = relatedNewPicks
                .filter(pick => pick.strategyName === 'kst');
            const filterByRsiTickers = (picks, ticker) => picks.filter(pick => 
                pick.ticker === ticker
                && pick.strategyName === 'rsi'
            );
            const withoutActiveRSI = newKstAlerts.filter(({ ticker }) => {
                const bothCurrentAndPrevPicks = [
                    ...relatedNewPicks,
                    ...todaysPicks.slice(-1),
                ];
                const filtered = filterByRsiTickers(bothCurrentAndPrevPicks, ticker);
                return !filtered.length;
            });
            // strlog({relatedPreviousPicks})
            let precededByRSI = withoutActiveRSI
                .map(kstAlert => ({
                    ...kstAlert,
                    prevRsiPicks: filterByRsiTickers(relatedPreviousPicks, kstAlert.ticker)
                }))
                .filter(({ prevRsiPicks }) => prevRsiPicks.length);

            // console.log({
            //     newKstAlerts,
            //     withoutActiveRSI,
            //     precededByRSI
            // })
            precededByRSI.forEach(({ ticker, prevRsiPicks, keys }) => {
                postRunPicks.push({
                    ticker,
                    keys: {
                        precededByRSI: true,
                        [`${period}min`]: true,
                        ...keys
                    },
                    data: {
                        prevRsiPicks
                    }
                });
            });
        });

        return postRunPicks;
    }
};