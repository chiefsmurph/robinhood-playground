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
        // 13,
        7, 
        3
    ],

    // sellAllStocksOnNthDay: 8,



    // moved to preferences

    // onlyUseCash: false,
    // purchaseAmt: 1.2,
    // actOnStPercent: 0.5,
    // maxPerPositionAfterOpenPerc: 2.5,

    
    
    onlyAvgDownOpenPositions: false,
    makeKeeperFundsAvailable: false,
    makeFundsOnlyForDowners: true,
    
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
        '[avg-downer]',
        '[sudden-drops-watchout-brunch]',
        '[sudden-drops-down30]',
        '[sudden-drops-!watchout-straightDown60]',
        '[sudden-drops-!watchout]',
        '[sudden-drops-brunch-straightDown30]',
        '[sudden-drops-down30-neutral]',
        '[sudden-drops-brunch-down30]',
        '[rsi-firstAlert-rsilt10-brunch]',
        '[sudden-drops-down40-bearish]',
        // because duh
        '[sudden-drops-mediumJump]',
        '[sudden-drops-majorJump]',
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
