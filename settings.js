// TODO: flatten list of strategies with PMs for emailObj same way as forPurchase

let expectedPickCount = 0;
// const pm = (str, multiplier = 1, groupName) => {

//     let totalCount = 0;
//     const lines = str.split('\n').map(line => line.trim()).filter(Boolean);
//     const onlyPms = lines.map(line => {
//         const [pm, count] = line.split(' ');
//         totalCount += Number(count || 1);
//         return pm;
//     });
//     const withMultiplier = totalCount * multiplier;
//     console.log({
//         groupName,
//         totalCount,
//         withMultiplier
//     });
//     expectedPickCount += withMultiplier;
//     return Array(multiplier).fill(onlyPms).flatten().map(pm => `[${pm}]`);
// };


module.exports = {
    // important settings

    wordFlags: ['split', 'reverse split', 'rocket', 'offering', 'delist', 'breakthrough', 'bankrupt', 'bankruptcy', 'coronavirus'],

    continueDownForDays: 4,

    // selling


    // sellBelow: {
    //     ADMS: 3.65
    // },
    sellAbove: {
        // YTEN: 1000000,
        // SAVA: 7.90
        // YAYO: 0.35,
        // TRPX: 0.64
        // RTTR: 0.5,
        // TRIB: 1.21,
        // IBIO: 2.4,
        // XAIR: 6.4
        // JDST: 2.3
    },

    dontBuy: [
        // 'STG'
    ],

    breakdownRSIs: [
        33,
        29,
        25,
        22,
        19,
        14,
        10
    ],

    // sellAllStocksOnNthDay: 8,



    // moved to preferences

    // onlyUseCash: false,
    // purchaseAmt: 1.2,
    // actOnPercent: 0.5,
    // maxPerPositionAfterOpenPerc: 2.5,

    
    
    onlyAvgDownOpenPositions: false,
    makeKeeperFundsAvailable: false,
    
    skipPurchasing: false,   /// really?????
    disableActOnSt: false,
    disableActOnZscore: false,

    
    // expectedPickCount: 200,
    multiplierThreshold: 4, // wont recommend picks below this multiplier count even if they are a forPurchase pick
    overallOffset: 0,

    overallMultiplierMultiplier: 1, /// DONT CHANGE NO MATTER WHAT (WELL UNLESS YOU NEED TO GET REAL SMALL MULTIPLIERS)
    avgDownerMultiplier: 1.7,
    minMultiplier: 20,
    maxOrigMultiplier: 160,
    maxMultiplier: 350,

    disableDayTrades: false,
    disableMultipliers: false,
    disableOnlyMinors: false,
    dontRecommendAtHigherPrices: false,

    forPurchase: [

        '[rsi-10min-rsilt10-initial]',
        '[overnight-drops-down10-straightDown120]',

        '[overnight-drops-mediumJump-straightDown120]',
        '[overnight-drops-down10-straightDown90]',
        '[overnight-drops-majorJump-straightDown90]',
        '[overnight-drops-watchout-straightDown120]',
        '[overnight-drops-mediumJump-straightDown90]',
        '[overnight-drops-!watchout-down20]',



        '[avg-downer]',
        '[sudden-drops]',
        '[sudden-drops-watchout-brunch]',
        '[sudden-drops-down30]',
        '[sudden-drops-down40]',
        '[sudden-drops-!watchout-straightDown60]',
        '[sudden-drops-!watchout]',
        '[sudden-drops-brunch-straightDown30]',
        '[sudden-drops-straightDown120]',
        '[sudden-drops-fitty]',
        '[sudden-drops-down15]',
        '[sudden-drops-down30-neutral]',
        '[sudden-drops-brunch-down30]',
        // '[rsi-firstAlert-rsilt10-brunch]',
        '[sudden-drops-down40-bearish]',
        // because duh
        '[sudden-drops-mediumJump]',
        '[sudden-drops-majorJump]',

        // '[rsi-notWatchout-firstAlert-rsilt10]',
        // '[rsi-rsilt10-initial]',
        // '[rsi-rsilt10-brunch]',
        // '[rsi-rsilt10-dinner]',
        // '[rsi-rsilt5]',



        // from spm 2-12-2021
        ...[
            'rsi-twoToFive-10min-rsilt25-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-neutral-notWatchout-brunch-5000',
            'rsi-twoToFive-10min-rsilt25-straightDown30-spread1-avgDollarVolume20000-dailyRSIgt50-firstAlert-neutral-notWatchout-lunch-5000',
            'rsi-twoToFive-10min-rsilt25-straightDown30-spread1-avgDollarVolume20000-dailyRSIgt50-firstAlert-neutral-notWatchout-dinner-5000',
            'rsi-twoToFive-10min-rsilt25-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-neutral-notWatchout-initial-5000',
            'rsi-twoToFive-10min-rsilt25-straightDown60-spread1-avgDollarVolume20000-dailyRSIgt50-neutral-notWatchout-lunch-5000'
        ],

        ...[
            'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-lunch-5000',
            'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
            'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
            'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-dinner-5000',
            'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-offering-watchout-initial-5000',
            'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-rocket-watchout-dinner-5000',
            'stocktwits-hotSt-mostBullish-spreadgt6-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-afterhours-5000',
            'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-afterhours-5000'
          ],

        //   ...[
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-initial-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-initial-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-brunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-dinner-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spreadgt6-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-afterhours-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-dinner-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-notWatchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-dinner-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-brunch-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-watchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-offering-watchout-brunch-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
        //     'smoothkst-hotSt-30min-isZeroCross-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-watchout-dinner-5000',
        //     'smoothkst-hotSt-10min-isZeroCross-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-initial-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-neutral-watchout-initial-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-watchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-notWatchout-initial-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-offering-watchout-initial-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-rocket-watchout-dinner-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-watchout-initial-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-offering-watchout-afterhours-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-firstAlert-neutral-notWatchout-lunch-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume10000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume10000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-notWatchout-brunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread3-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-afterhours-5000',
        //     'smoothkst-hotSt-10min-isZeroCross-spread2-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-initial-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-firstAlert-neutral-notWatchout-initial-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spreadgt6-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-watchout-afterhours-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-notWatchout-initial-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-firstAlert-bullish-watchout-dinner-5000',
        //     'smoothkst-hotSt-10min-isZeroCross-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-gnewsrocket-watchout-initial-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-notWatchout-brunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-gnewsrocket-watchout-initial-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread2-avgDollarVolume10000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-notWatchout-initial-5000',
        //     'smoothkst-hotSt-30min-isZeroCross-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread5-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-firstAlert-bullish-notWatchout-dinner-5000',
        //     'smoothkst-hotSt-10min-isZeroCross-spread2-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-neutral-watchout-afterhours-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread4-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-notWatchout-afterhours-5000',
        //     'smoothkst-hotSt-30min-isZeroCross-spread2-avgDollarVolume10000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-notWatchout-brunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume10000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume10000-dailyRSIgt30-notStraightDowner-firstAlert-neutral-notWatchout-lunch-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-lunch-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread3-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-afterhours-5000',
        //     'smoothkst-hotSt-30min-isSignalCross-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume3500-dailyRSIgt30-notStraightDowner-firstAlert-neutral-notWatchout-initial-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-rocket-watchout-dinner-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spreadgt6-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-neutral-watchout-afterhours-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume10000-dailyRSIgt50-notStraightDowner-neutral-notWatchout-initial-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume3500-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-neutral-notWatchout-dinner-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-offering-watchout-dinner-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-neutral-watchout-lunch-5000',
        //     'smoothkst-hotSt-30min-isZeroCross-spread2-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spreadgt6-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-neutral-notWatchout-afterhours-5000',
        //     'smoothkst-hotSt-30min-isSignalCross-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-dinner-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-watchout-initial-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread5-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-afterhours-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread2-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-dinner-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-notWatchout-lunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume3500-dailyRSIgt50-notStraightDowner-firstAlert-neutral-notWatchout-initial-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume10000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-brunch-5000',
        //     'smoothkst-hotSt-10min-isZeroCross-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-initial-5000',
        //     'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-notWatchout-brunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-watchout-brunch-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-watchout-afterhours-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-afterhours-5000',
        //     'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-dinner-5000'
        //   ],



    ],
    // forPurchaseVariation: '75Perc5Day-yesincludingblanks',
    // fallbackSellStrategy: 'limit8',
    force: {
        sell: [
        ],
        keep: [
            // 'LK',
            // 'CIDM'
            // 'ADMS',
        ]
    },
    // expectedPickCount
};
