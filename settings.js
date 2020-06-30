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

    breakdownRSIs: [13, 7, 3],

    // sellAllStocksOnNthDay: 8,
    purchaseAmt: 1.2,
    actOnStPercent: 0.8,
    maxPerPositionAfterOpenPerc: 10,
    
    onlyAvgDownOpenPositions: true,
    makeKeeperFundsAvailable: false,
    makeFundsOnlyForDowners: false,
    
    onlyUseCash: false,
    skipPurchasing: false,   /// really?????

    
    // expectedPickCount: 200,
    multiplierThreshold: 4, // wont recommend picks below this multiplier count even if they are a forPurchase pick
    overallOffset: 0,

    overallMultiplierMultiplier: 1, /// DONT CHANGE NO MATTER WHAT (WELL UNLESS YOU NEED TO GET REAL SMALL MULTIPLIERS)
    avgDownerMultiplier: 1.7,
    minMultiplier: 11,
    maxOrigMultiplier: 60,

    disableDayTrades: true,
    disableMultipliers: false,
    disableOnlyMinors: false,

    forPurchase: [


        

        ...`

        // red-and-bullish
        
        rsi-10min-rsilt5
        rsi-10min-rsilt10
        rsi-rsilt10-initial
        rsi-rsilt5
        stocktwits-fitty
        rsi-rsilt5-lunch
        sudden-drops-down40
        overnight-drops-down40
        sudden-drops-bullish
        



        // WOAH NELLY!!
        sudden-drops
        sudden-drops-mediumJump

        continue-down
        most-low


        // overnight-drops-mediumJump-down15
        // overnight-drops-mediumJump-down15
        // overnight-drops-mediumJump-down15
        // overnight-drops-mediumJump-down15
        // overnight-drops-mediumJump-down15
        overnight-drops-minorJump-down15
        // overnight-drops-watchout-mediumJump


        overnight-drops-mediumJump-down10
        overnight-drops-mediumJump-initial
        overnight-drops-mediumJump-down10
        overnight-drops-down20-straightDown30
        // overnight-drops-watchout-down30
        // overnight-drops-down30
        overnight-drops-majorJump-down20
        overnight-drops-!watchout-down20
        overnight-drops-down40-straightDown30
        overnight-drops-mediumJump-down20
        // overnight-drops-majorJump-straightDown90
        // overnight-drops-majorJump-straightDown30


        sudden-drops-holds


        // rsi-30min-rsilt15-dinner
        // rsi-30min-notWatchout-rsilt15


        // overnight-drops-down40
        // overnight-drops-down40
        // overnight-drops-down40
        // overnight-drops-down40
        // overnight-drops-down40
        // overnight-drops-down40
        // overnight-drops-down40
        // overnight-drops-down40

        // the mature picks
        sudden-drops-brunch-straightDown120
        sudden-drops-brunch-straightDown120
        sudden-drops-brunch-straightDown120
        sudden-drops-brunch-straightDown120-bearish
        sudden-drops-brunch-straightDown120-bearish
        sudden-drops-brunch-straightDown120-bearish


        // HAHA LOL JK IMMATURE PICKS 2020!!
        // derived-unfilteredMovers-index0-tenMinCount33
        // derived-unfilteredMovers-index0-tenMinCount3
        // derived-realChillMoverVolume-index2-tenMinCount3
        // derived-realChillMoverVolume-index2-tenMinCount21
        // derived-unfilteredMovers-index0-tenMinCount15
        // derived-unfilteredMovers-index0-tenMinCount3
        // derived-unfilteredMovers-index0
        // derived-realChillMovers-index0-tenMinCount5
        // derived-realChillMovers-index0-tenMinCount2
        // derived-realChillMovers-index0-tenMinCount2
        // derived-chillSlightDownVolume-index0-tenMinCount6
        // derived-unfilteredSlightlyUpVolume-tenMinCount1-watchout
        // derived-chillMoverVolume-index0-watchout
        // derived-unfilteredMovers-index0-tenMinCount6
        // derived-unfilteredMovers-index0-tenMinCount5
        // derived-chillSlightDownVolume-index0-tenMinCount5
        // derived-realChillSlightDownVolume-index0-tenMinCount5
        // derived-chillMoverVolume-index0-tenMinCount5

        // derived-tenMinCount0-watchout
        // derived-chillSlightlyUpVolume-tenMinCount0-watchout
        // derived-unfilteredSlightDownVolume-tenMinCountNeg1-watchout
        // derived-chillMovers-index2-tenMinCountNeg2
        // derived-chillMoverVolume-index0-tenMinCount15-watchout

        // derived-unfilteredMovers-tenMinCount3-watchout
        // derived-unfilteredMovers-tenMinCount3-watchout
        // derived-index0-tenMinCount0-watchout
        // derived-chillMoverVolume-index3-tenMinCount2
        // derived-chillMoverVolume-index3-tenMinCount2
        // derived-realChillMovers-index0-tenMinCount15
        // derived-realChillMoverVolume-index2-tenMinCount15
        // derived-chillMovers-tenMinCount27-watchout

        // LETS GET SEAN SPICEY


        // derived-chillMoverVolume-watchout
        // derived-chillMoverVolume-index0
        // derived-chillMoverVolume-tenMinCount5-watchout
        // derived-chillMoverVolume-tenMinCount6
        // derived-chillMoverVolume-tenMinCount1
        // derived-chillMoverVolume-tenMinCount9
        // derived-realChillMovers-tenMinCount9
        // derived-unfilteredMovers-tenMinCount3
        // derived-unfilteredMovers-tenMinCount5
        // derived-unfilteredMovers-tenMinCount27
        // derived-tenMinCount27-watchout
        // derived-unfilteredMoverVolume-tenMinCount1


        // derived-unfilteredMovers-index0-tenMinCount9
        // derived-unfilteredMovers-index0-tenMinCount15	
        // derived-unfilteredMovers-index0-tenMinCount27
        // derived-unfilteredMovers-index0-tenMinCount40
        // derived-index0-tenMinCount27-watchout
        // derived-index0-tenMinCount6-watchout
        // derived-index2-tenMinCount9-watchout
        // derived-index0-tenMinCount33-watchout
        // derived-chillMoverVolume-index0-tenMinCount21
        // derived-unfilteredMovers-index1-tenMinCount5



        avg downer
        avg-downer
        avg-downer-under1min
        avg-downer-under1min
        avg-downer-under1min
        avg-downer-under5min
        avg-downer-under5min
        avg-downer-under5min
        avg-downer-under10min
        avg-downer-under10min


        // avg-downer-1count
        // avg-downer-2count
        // avg-downer-2count
        // avg-downer-3count
        // avg-downer-3count
        // avg-downer-3count
        // avg-downer-4count
        // avg-downer-4count
        // avg-downer-4count
        // avg-downer-5count
        // avg-downer-5count
        // avg-downer-5count

        // all majorJumps


        sudden-drops-majorJump
        sudden-drops-majorJump
        sudden-drops-majorJump-initial
        sudden-drops-lunch-down15
        sudden-drops-dinner-down20
        sudden-drops-watchout-down20
        sudden-drops-majorJump-down40
        sudden-drops-!watchout-down15
        sudden-drops-down15-bearish
        sudden-drops-down20
        sudden-drops-watchout-majorJump
        sudden-drops-majorJump-!straightDown
        sudden-drops-!watchout-straightDown90
        sudden-drops-!watchout-down15
        sudden-drops-minorJump-brunch-straightDown120
        sudden-drops-watchout-majorJump
        sudden-drops-majorJump-!straightDown
        sudden-drops-watchout-majorJump-!straightDown
        sudden-drops-lunch-down15
        sudden-drops-majorJump-down15-!straightDown
        sudden-drops-majorJump-initial-!straightDown
        sudden-drops-mediumJump-lunch-down15
        sudden-drops-lunch-down15-!straightDown
        sudden-drops-watchout-dinner-down20
        sudden-drops-majorJump-down20-bearish
        sudden-drops-down20-straightDown30-bearish
        sudden-drops-watchout-majorJump-down40
        sudden-drops-watchout-initial-down10
        sudden-drops-down15-straightDown90-bullish
        sudden-drops-initial-down10-bullish
        sudden-drops-!watchout-minorJump-dinner
        sudden-drops-dinner-straightDown120

        // the !watchout majorJump GOLD


        sudden-drops-!watchout-majorJump
        sudden-drops-!watchout-majorJump
        sudden-drops-!watchout-majorJump
        
        sudden-drops-!watchout-majorJump-down
        sudden-drops-!watchout-majorJump-!straightDown
        sudden-drops-!watchout-majorJump-down10-!straightDown
        sudden-drops-!watchout-majorJump-down-!straightDown
        sudden-drops-!watchout-majorJump-bearish

        sudden-drops-!watchout-majorJump-initial-down
        sudden-drops-!watchout-majorJump-straightDown
        sudden-drops-!watchout-majorJump-down-!straightDown	
        


        sudden-drops-!watchout-majorJump-neutral
        sudden-drops-!watchout-majorJump-bullish
        


        sudden-drops-!watchout-majorJump-straightDown60


        sudden-drops-!watchout-majorJump-down30
        // overnight-drops-!watchout-majorJump-!down



        sudden-drops-!watchout-majorJump-initial
        

        sudden-drops-!watchout-majorJump-dinner-down20
        sudden-drops-!watchout-majorJump-down10-straightDown
        sudden-drops-!watchout-majorJump-down-straightDown
        sudden-drops-!watchout-majorJump-down-straightDown
        sudden-drops-!watchout-majorJump-down10


        sudden-drops-!watchout-majorJump-down20
        sudden-drops-!watchout-majorJump-down20

        // HEY DONT FORGET ABOUT THE QUALITY MEDIUMJUMPS NOW!

        sudden-drops-mediumJump

        sudden-drops-mediumJump-lunch
        sudden-drops-mediumJump-lunch
        sudden-drops-mediumJump-straightDown60
        sudden-drops-mediumJump-straightDown90
        sudden-drops-mediumJump-brunch
        sudden-drops-mediumJump-down10-bearish
        sudden-drops-mediumJump-!straightDown-bullish
        // overnight-drops-mediumJump-!down-straightDown60,
        sudden-drops-mediumJump-brunch-!straightDown
        sudden-drops-!watchout-mediumJump-down10
        sudden-drops-mediumJump-!down
        // overnight-drops-!watchout-mediumJump-initial-!down-straightDown60
        // overnight-drops-!watchout-mediumJump-initial-straightDown60
        sudden-drops-watchout-mediumJump-brunch-down15-!straightDown
        sudden-drops-mediumJump-brunch-down-!straightDown
        sudden-drops-!watchout-mediumJump-brunch-down10-!straightDown
        sudden-drops-mediumJump-brunch-down10-!straightDown
        sudden-drops-mediumJump-brunch-!down-!straightDown
        sudden-drops-mediumJump-brunch-!down-!straightDown

        sudden-drops-zeroToOne
        sudden-drops-zeroToOne

        



        // more majorJumps
        sudden-drops-majorJump-down20
        sudden-drops-majorJump-bullish
        sudden-drops-majorJump-straightDown60
        sudden-drops-majorJump-straightDown60
        sudden-drops-majorJump-straightDown60
        sudden-drops-majorJump-down15


        // what why havent these been chosen majorJumps
        // sudden-drops-majorJump-!down
        // sudden-drops-majorJump-!down-!straightDown



        // f yeah avg-downers!
        avg-downer-under10min-2count
        avg-downer-under10min-3count
        avg-downer-under120min
        avg-downer-under120min
        avg-downer-under120min
        avg-downer-under120min
        avg-downer-under120min

        avg-downer-under5min
        avg-downer-under5min
        avg-downer-under5min
        

        avg-downer-isBeforeClose
        avg-downer-isBeforeClose
        avg-downer-isBeforeClose











        // only !watchout 's
        sudden-drops-!watchout-dinner-straightDown60
        
        sudden-drops-!watchout-lunch-straightDown30
        sudden-drops-!watchout-lunch-!down
        
        
        sudden-drops-!watchout-down15-neutral
        // sudden-drops-!watchout-down10-neutral
        // sudden-drops-!watchout-down-neutral
        
        
        sudden-drops-!watchout-brunch-bullish
        // sudden-drops-!watchout-down-neutral



        sudden-drops-!watchout-minorJump-initial-down10-straightDown60
        sudden-drops-!watchout-dinner-down10-straightDown60

        sudden-drops-!watchout-down30-neutral
        sudden-drops-!watchout-straightDown60-neutral




        sudden-drops-!watchout-brunch-down10-straightDown60
        sudden-drops-!watchout-dinner-down15-!straightDown
        sudden-drops-!watchout-dinner-down15
        sudden-drops-!watchout-minorJump-down15-straightDown30
        sudden-drops-!watchout-mediumJump-brunch-!down
        // overnight-drops-!watchout-initial-down15-straightDown120
        sudden-drops-!watchout-initial-down15-straightDown120
        sudden-drops-!watchout-down30-straightDown60
        sudden-drops-!watchout-dinner-bullish
        sudden-drops-!watchout-minorJump-down10-straightDown60
        sudden-drops-!watchout-brunch-down-straightDown60



        sudden-drops-!watchout-down30-bullish
        sudden-drops-!watchout-down20-bullish
        sudden-drops-!watchout-lunch-neutral
        sudden-drops-!watchout-brunch-neutral
        sudden-drops-!watchout-dinner-neutral
        sudden-drops-!watchout-straightDown120-bullish
        

        sudden-drops-!watchout-lunch-down-straightDown30
        sudden-drops-!watchout-lunch-down10-straightDown
        sudden-drops-!watchout-mediumJump-initial-down10-!straightDown

        // creme found using new filters
        sudden-drops-!watchout-mediumJump-!down-straightDown
        sudden-drops-!watchout-mediumJump-!down-straightDown
        sudden-drops-!watchout-mediumJump-lunch-!straightDown
        sudden-drops-!watchout-brunch-down30
        sudden-drops-!watchout-brunch-down30
        
        sudden-drops-!watchout-mediumJump-down20-straightDown30
        sudden-drops-!watchout-mediumJump-down20-straightDown30
        sudden-drops-!watchout-dinner-down-straightDown60
        sudden-drops-!watchout-mediumJump-down20-straightDown
        sudden-drops-!watchout-majorJump-dinner-straightDown
        sudden-drops-!watchout-minorJump-lunch-!down-straightDown

        sudden-drops-!watchout-mediumJump-down10-!straightDown
        sudden-drops-!watchout-straightDown60-bullish
        sudden-drops-!watchout-dinner-down-straightDown120
        sudden-drops-!watchout-dinner-down20
        sudden-drops-!watchout-majorJump-brunch
        sudden-drops-!watchout-dinner-down
        sudden-drops-!watchout-dinner
        
        
        

        /// not !watchout
        sudden-drops-hotSt
        sudden-drops-hotSt

        sudden-drops-lunch-down20
        sudden-drops-lunch-!down
        sudden-drops-lunch-straightDown120
        sudden-drops-lunch-neutral

        sudden-drops-down20-bullish
        sudden-drops-down20-bullish
        sudden-drops-brunch-down30
        sudden-drops-minorJump-brunch-down10-!straightDown
        sudden-drops-brunch-down10-bullish
        sudden-drops-mediumJump-down-straightDown30
        sudden-drops-dinner-down15
        sudden-drops-down10-straightDown60
        sudden-drops-mediumJump-straightDown30
        sudden-drops-down10-straightDown-bullish
        // overnight-drops-watchout-minorJump-down-!straightDown

        sudden-drops-straightDown60
        sudden-drops-mediumJump-down15-bullish

        
        


        // fine a couple watchouts
        sudden-drops-watchout-brunch-down10
        sudden-drops-watchout-dinner-down-!straightDown
        sudden-drops-watchout-initial-down10-straightDown
        sudden-drops-watchout-minorJump-brunch-down10
        sudden-drops-watchout-dinner-down10-!straightDown









        // overnighters
        overnight-drops-mediumJump-straightDown60
        overnight-drops-mediumJump-straightDown60

        overnight-drops-minorJump-down10-!straightDown
        overnight-drops-minorJump-down10-!straightDown
        overnight-drops-minorJump-down10-!straightDown
        overnight-drops-minorJump-down10-!straightDown
        overnight-drops-minorJump-down10-!straightDown
        overnight-drops-minorJump-down10-!straightDown
        overnight-drops-minorJump-down10-!straightDown
        overnight-drops-minorJump-down10-!straightDown
        overnight-drops-minorJump-down10-!straightDown





        // WITH TODAYTREND


        //     // wow solid min values!
        //     // THE TRUE GOLD
        //     sudden-drops-!watchout-majorJump-initial-down
        //     sudden-drops-!watchout-majorJump-initial-down
        //     sudden-drops-minorJump-brunch-down10-!straightDown
        //     sudden-drops-minorJump-brunch-down10-!straightDown
        //     sudden-drops-watchout-dinner-down-!straightDown
        //     sudden-drops-watchout-dinner-down-!straightDown
        //     sudden-drops-watchout-initial-down10-straightDown
        //     sudden-drops-watchout-initial-down10-straightDown


        //     // common
        //     sudden-drops-majorJump-down20
        //     sudden-drops-down30-straightDown60
        //     sudden-drops-initial-down30-straightDown

        //     // big dash
        //     sudden-drops-!watchout-majorJump-initial
        //     sudden-drops-watchout-dinner-down-!straightDown
        //     sudden-drops-!watchout-brunch-down30-!straightDown


        //     // sentiment
        //     sudden-drops-down20-bullish
        //     sudden-drops-down10-neutral
        //     sudden-drops-dinner-neutral
        //     sudden-drops-brunch-bullish


        //     // from pm page
        //     sudden-drops-watchout-minorJump-dinner-down-!straightDown
        //     sudden-drops-hotSt
        //     sudden-drops-majorJump-!down-!straightDown
        //     sudden-drops-watchout-dinner-down15-!straightDown
        //     sudden-drops-!watchout-majorJump-initial-!straightDown
        //     sudden-drops-minorJump-brunch-bullish
        //     sudden-drops-mediumJump-down20-straightDown30
        //     sudden-drops-watchout-mediumJump-down10
        //     sudden-drops-dinner-straightDown60-neutral

        //     // tuesday

        //     sudden-drops-watchout-mediumJump-initial-down10-!straightDown
        //     sudden-drops-!watchout-mediumJump-dinner
        //     sudden-drops-minorJump-lunch-down10-straightDown90
        //     sudden-drops-watchout-down10-straightDown
        //     sudden-drops-!watchout-majorJump-bearish
        //     sudden-drops-watchout-lunch-neutral
        //     sudden-drops-lunch-down10-straightDown90

        //     // wednesday
        //     sudden-drops-mediumJump-lunch-down20-straightDown
        //     sudden-drops-mediumJump-lunch-down20
        //     sudden-drops-watchout-down10-straightDown30
        //     sudden-drops-mediumJump-!down-straightDown
        //     sudden-drops-lunch-straightDown60
        //     sudden-drops-watchout-brunch-down10-straightDown30
        //     sudden-drops-down15-neutral


        // // NO TODAYTREND

        //     sudden-drops-watchout-minorJump-brunch-down10
        //     sudden-drops-down15-straightDown120
        //     sudden-drops-lunch-down20
        //     sudden-drops-majorJump-down10


        //     // sentiment
        //     sudden-drops-dinner-bullish
        //     sudden-drops-initial-down20-bullish
        //     sudden-drops-down10-straightDown-bullish
        //     sudden-drops-down10-straightDown-bullish
        //     sudden-drops-brunch-down15-bullish
        //     sudden-drops-brunch-down10-bullish
        //     sudden-drops-lunch-down10-bullish
        //     sudden-drops-straightDown120-bullish

        //     sudden-drops-mediumJump-straightDown30-neutral
        //     sudden-drops-watchout-down10-neutral
        //     sudden-drops-initial-down20-neutral
        //     sudden-drops-mediumJump-down10-neutral
        //     sudden-drops-!down-straightDown60-neutral


        // rsi-rsilt5-initial
        // rsi-rsilt10-initial
        // rsi-10min-rsilt10
        sudden-drops-lunch
        // stocktwits-holds
        // derived-chillSlightlyUpVolume-watchout
        // derived-unfilteredSlightlyUpVolume-watchout
        


        `
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .filter(line => !line.startsWith('//'))
            .map(pm => `[${pm}]`)







        // bullish
        // '[sudden-drops-down20-bullish]',
        // '[sudden-drops-straightDown120-bullish]',
        // '[sudden-drops-brunch-bullish]',
        // '[sudden-drops-down10-straightDown-bullish]',

        // // neutral
        // '[sudden-drops-dinner-neutral]',
        // '[sudden-drops-straightDown90-neutral]',
        // '[sudden-drops-straightDown60-neutral]',
        // '[sudden-drops-mediumJump-down10-neutral]',
        // '[sudden-drops-down10-straightDown-neutral]',
        // '[sudden-drops-mediumJump-straightDown-neutral]',
        // '[sudden-drops-dinner-neutral]',
        // '[sudden-drops-down10-neutral]',

        // // bearish
        // '[sudden-drops-watchout-down10-bearish]',

        // // 

        // '[sudden-drops-majorJump-straightDown60]',
        // '[sudden-drops-!watchout-mediumJump-dinner-straightDown30]',
        // '[sudden-drops-!watchout-minorJump-lunch-straightDown]',
        // '[sudden-drops-brunch-down10-straightDown]',
        // '[sudden-drops-!watchout-minorJump-lunch-straightDown90]',
        // '[sudden-drops-!watchout-lunch-straightDown]',
        // '[sudden-drops-brunch-down10-straightDown]',
        // '[sudden-drops-watchout-lunch-down20]',
        // '[sudden-drops-lunch-straightDown90]',
















        // DISABLING HIGH COUNTS

        // '[sudden-drops-majorJump]',
        // '[sudden-drops-watchout-initial-down]',
        // '[sudden-drops-mediumJump]',
        // '[sudden-drops-watchout-!straightDown]',
        // '[sudden-drops-watchout-down-!straightDown]',
        // '[sudden-drops-minorJump-down10]',
        // '[sudden-drops-!watchout-minorJump-!down-!straightDown]',
        // '[sudden-drops-twoToFive]',
        // '[sudden-drops-watchout-minorJump]',
        // '[sudden-drops-zeroToOne]',
        // '[sudden-drops-watchout-down]',


        // // baselines

        // '[sudden-drops-lunch]',
        // '[sudden-drops-lunch]',
        // '[sudden-drops-lunch]',
        
        // '[sudden-drops-majorJump-straightDown]',
        // '[sudden-drops-down15-straightDown]',

        // // wednesday

        // '[sudden-drops-watchout-initial-down]',
        // '[sudden-drops-mediumJump-down]',
        // '[sudden-drops-majorJump-initial]',
        // '[sudden-drops-minorJump-brunch-down10]',


        // // more
        // '[sudden-drops-dinner-down-straightDown30]',
        // '[sudden-drops-watchout-minorJump-brunch-down]',
        // '[sudden-drops-minorJump-lunch-down10-straightDown]',
        // '[sudden-drops-watchout-down15-straightDown30]',
        // '[sudden-drops-watchout-down30]',
        // '[sudden-drops-watchout-down10]',
        // '[sudden-drops-lunch-down20]',

        // // yes today trend high percUp
        // '[sudden-drops-lowVolFitty]',
        // '[sudden-drops-dinner-down15-straightDown]',
        // '[sudden-drops-mediumJump-dinner-down]',
        // // '[sudden-drops-minorJump-!straightDown]',

        // // no today trend but 90% percUp
        // '[sudden-drops-majorJump-down]',
        // '[sudden-drops-brunch-down10]',
        // '[sudden-drops-mediumJump-brunch-!straightDown]',
        // '[sudden-drops-!watchout-majorJump-!straightDown]',
        // '[sudden-drops-mediumJump-down15]',
        // '[sudden-drops-watchout-mediumJump-initial]',

        // // spice added oct26

        // '[sudden-drops-!watchout-minorJump-lunch-!down-straightDown120]',
        // '[sudden-drops-!watchout-initial-down15]',
        // '[sudden-drops-!watchout-minorJump-initial-down15]',
        // '[sudden-drops-brunch-down10-straightDown]',
        // '[sudden-drops-watchout-dinner-down-!straightDown]',
        // '[sudden-drops-watchout-dinner-down15]',
        // '[sudden-drops-majorJump-down10]',
        // '[sudden-drops-!watchout-down15]',
        // '[sudden-drops-!watchout-majorJump-initial]',
        // '[sudden-drops-majorJump-initial-straightDown]',


        // // risky
        
        // // '[sudden-drops-initial-down30]',
        // '[sudden-drops-mediumJump-initial-down30]',
        // '[sudden-drops-lunch-down20]',
        // '[sudden-drops-!watchout-mediumJump-down20-straightDown30]',
        // '[sudden-drops-mediumJump-initial-down15-!straightDown]',
        // // '[overnight-drops-majorJump-!down]',
        // '[sudden-drops-dinner-down15-straightDown30]',
        // // '[overnight-drops-majorJump-!down]',
        // // '[overnight-drops-majorJump-down10]',
        // // '[rsi-daily-shouldWatchout-firstAlert]',
        // // '[overnight-drops-majorJump-down10]',

        // // stars
        // '[sudden-drops-watchout-majorJump]',
        // '[sudden-drops-majorJump-initial-down-straightDown]',
        // '[sudden-drops-majorJump-initial-down-straightDown]',


        // // '[average-down-recommendation]'


        // '[sudden-drops-brunch-down10-!straightDown]',
        // '[sudden-drops-brunch-down10-!straightDown]',
        // '[sudden-drops-watchout-minorJump-brunch-down10-!straightDown]',
        // '[sudden-drops-mediumJump-brunch-down10]',

        // // 100%
        // '[sudden-drops-minorJump-down15-straightDown120]',
        // '[sudden-drops-!watchout-mediumJump-straightDown60]',
        // '[sudden-drops-!watchout-mediumJump-brunch-down]',
        // '[sudden-drops-mediumJump-down20-straightDown30]',
        // '[sudden-drops-mediumJump-brunch]',
        // '[sudden-drops-!watchout-majorJump]',
        // '[sudden-drops-majorJump-down30-straightDown]',
        // '[sudden-drops-majorJump-dinner]',
        // '[sudden-drops-minorJump-down15-straightDown30]',
        // '[sudden-drops-watchout-minorJump-!down-!straightDown]',
        // '[sudden-drops-minorJump-lunch-!down]',
        // '[sudden-drops-minorJump-brunch-down10-straightDown90]',
        // '[sudden-drops-!watchout-brunch-down10]',
        // '[overnight-drops-watchout-straightDown60]',


        // '[sudden-drops-watchout-minorJump-down10-straightDown]',
        // '[avg-downer-under30min-1count]',




        // // no hits top

        // '[sudden-drops-majorJump-!down-!straightDown]',
        // '[overnight-drops-!watchout-majorJump-!down-!straightDown]',
        // '[sudden-drops-majorJump-dinner-down10-!straightDown]',
        // '[overnight-drops-majorJump-initial-down30-straightDown60]',


        // '[sudden-drops-down30-straightDown90]',
        // '[sudden-drops-majorJump-initial-down15]',
        // '[sudden-drops-minorJump-brunch-down10-!straightDown]',
        // '[sudden-drops-majorJump-dinner-!straightDown]',
        // '[sudden-drops-majorJump-down15]',
        // '[sudden-drops-initial-down15-straightDown120]',
        // // '[overnight-drops-watchout-mediumJump-!down-straightDown]',
        // '[sudden-drops-brunch-down30-!straightDown]',
        // '[sudden-drops-brunch-down30-!straightDown]',


        // '[sudden-drops-down10-straightDown30]',
        // '[sudden-drops-!watchout-minorJump-lunch-straightDown]',
        // '[sudden-drops-watchout-majorJump-dinner-down]',
        // '[sudden-drops-down30-straightDown]',

        // '[avg-downer-under60min-2count]',
        // '[avg-downer-under60min-2count]',


        // '[sudden-drops-watchout-mediumJump-initial-down]',
        // '[sudden-drops-mediumJump-lunch-down20]',
        // '[sudden-drops-!watchout-lunch-straightDown]',
        // '[sudden-drops-watchout-majorJump-down-straightDown]',
        // '[sudden-drops-!watchout-minorJump-down10-straightDown30]',
        // '[sudden-drops-!watchout-dinner-straightDown30]',
        // '[sudden-drops-!watchout-dinner-down30-straightDown]',

        // '[sudden-drops-!watchout-majorJump-down]',
        // '[sudden-drops-brunch-down15-straightDown30]',
        // '[sudden-drops-minorJump-lunch]',
        // '[sudden-drops-down20-!straightDown-bearish]',
        // '[sudden-drops-mediumJump-down20-bearish]',
        // '[sudden-drops-!watchout-!straightDown-bearish]',
        // '[sudden-drops-minorJump-lunch]',
        // '[sudden-drops-watchout-mediumJump-initial-down15-!straightDown]',
        // '[sudden-drops-lunch-straightDown120]',

        // '[sudden-drops-mediumJump-lunch]',
        // '[sudden-drops-mediumJump-lunch-!straightDown]',
        // '[sudden-drops-mediumJump-lunch-!straightDown]',


        // '[sudden-drops-mediumJump-lunch-bearish]',
        // '[sudden-drops-brunch-bearish]',
        // '[sudden-drops-minorJump-straightDown30-bearish]',
        // '[sudden-drops-!watchout-!straightDown-neutral]',
        // '[sudden-drops-!watchout-down-neutral]',
        // '[sudden-drops-initial-!straightDown-neutral]',
        // '[sudden-drops-lunch-down10-bearish]',

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
