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
    sellAllStocksOnNthDay: 8,
    purchaseAmt: 9,
    forPurchase: [


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


        // baselines

        '[sudden-drops-lunch]',
        '[sudden-drops-lunch]',
        '[sudden-drops-lunch]',
        
        '[sudden-drops-majorJump-straightDown]',
        '[sudden-drops-down15-straightDown]',

        // wednesday

        '[sudden-drops-watchout-initial-down]',
        '[sudden-drops-mediumJump-down]',
        '[sudden-drops-majorJump-initial]',
        '[sudden-drops-minorJump-brunch-down10]',


        // more
        '[sudden-drops-dinner-down-straightDown30]',
        '[sudden-drops-watchout-minorJump-brunch-down]',
        '[sudden-drops-minorJump-lunch-down10-straightDown]',
        '[sudden-drops-watchout-down15-straightDown30]',
        '[sudden-drops-watchout-down30]',
        '[sudden-drops-watchout-down10]',
        '[sudden-drops-lunch-down20]',

        // yes today trend high percUp
        '[sudden-drops-lowVolFitty]',
        '[sudden-drops-dinner-down15-straightDown]',
        '[sudden-drops-mediumJump-dinner-down]',
        // '[sudden-drops-minorJump-!straightDown]',

        // no today trend but 90% percUp
        '[sudden-drops-majorJump-down]',
        '[sudden-drops-brunch-down10]',
        '[sudden-drops-mediumJump-brunch-!straightDown]',
        '[sudden-drops-!watchout-majorJump-!straightDown]',
        '[sudden-drops-mediumJump-down15]',
        '[sudden-drops-watchout-mediumJump-initial]',

        // spice added oct26

        '[sudden-drops-!watchout-minorJump-lunch-!down-straightDown120]',
        '[sudden-drops-!watchout-initial-down15]',
        '[sudden-drops-!watchout-minorJump-initial-down15]',
        '[sudden-drops-brunch-down10-straightDown]',
        '[sudden-drops-watchout-dinner-down-!straightDown]',
        '[sudden-drops-watchout-dinner-down15]',
        '[sudden-drops-majorJump-down10]',
        '[sudden-drops-!watchout-down15]',
        '[sudden-drops-!watchout-majorJump-initial]',
        '[sudden-drops-majorJump-initial-straightDown]',


        // risky
        
        // '[sudden-drops-initial-down30]',
        '[sudden-drops-mediumJump-initial-down30]',
        '[sudden-drops-lunch-down20]',
        '[sudden-drops-!watchout-mediumJump-down20-straightDown30]',
        '[sudden-drops-mediumJump-initial-down15-!straightDown]',
        // '[overnight-drops-majorJump-!down]',
        '[sudden-drops-dinner-down15-straightDown30]',
        // '[overnight-drops-majorJump-!down]',
        // '[overnight-drops-majorJump-down10]',
        // '[rsi-daily-shouldWatchout-firstAlert]',
        // '[overnight-drops-majorJump-down10]',

        // stars
        '[sudden-drops-watchout-majorJump]',
        '[sudden-drops-majorJump-initial-down-straightDown]',
        '[sudden-drops-majorJump-initial-down-straightDown]',


        // '[average-down-recommendation]'


        '[sudden-drops-brunch-down10-!straightDown]',
        '[sudden-drops-brunch-down10-!straightDown]',
        '[sudden-drops-watchout-minorJump-brunch-down10-!straightDown]',
        '[sudden-drops-mediumJump-brunch-down10]',

        // 100%
        '[sudden-drops-minorJump-down15-straightDown120]',
        '[sudden-drops-!watchout-mediumJump-straightDown60]',
        '[sudden-drops-!watchout-mediumJump-brunch-down]',
        '[sudden-drops-mediumJump-down20-straightDown30]',
        '[sudden-drops-mediumJump-brunch]',
        '[sudden-drops-!watchout-majorJump]',
        '[sudden-drops-majorJump-down30-straightDown]',
        '[sudden-drops-majorJump-dinner]',
        '[sudden-drops-minorJump-down15-straightDown30]',
        '[sudden-drops-watchout-minorJump-!down-!straightDown]',
        '[sudden-drops-minorJump-lunch-!down]',
        '[sudden-drops-minorJump-brunch-down10-straightDown90]',
        '[sudden-drops-!watchout-brunch-down10]',
        '[overnight-drops-watchout-straightDown60]',


        '[sudden-drops-watchout-minorJump-down10-straightDown]',
        '[avg-downer-under30min-1count]',




        // no hits top

        '[sudden-drops-majorJump-!down-!straightDown]',
        '[overnight-drops-!watchout-majorJump-!down-!straightDown]',
        '[sudden-drops-majorJump-dinner-down10-!straightDown]',
        '[overnight-drops-majorJump-initial-down30-straightDown60]',


        '[sudden-drops-down30-straightDown90]',
        '[sudden-drops-majorJump-initial-down15]',
        '[sudden-drops-minorJump-brunch-down10-!straightDown]',
        '[sudden-drops-majorJump-dinner-!straightDown]',
        '[sudden-drops-majorJump-down15]',
        '[sudden-drops-initial-down15-straightDown120]',
        // '[overnight-drops-watchout-mediumJump-!down-straightDown]',
        '[sudden-drops-brunch-down30-!straightDown]',
        '[sudden-drops-brunch-down30-!straightDown]',


        '[sudden-drops-down10-straightDown30]',
        '[sudden-drops-!watchout-minorJump-lunch-straightDown]',
        '[sudden-drops-watchout-majorJump-dinner-down]',
        '[sudden-drops-down30-straightDown]',

        '[avg-downer-under60min-2count]',
        '[avg-downer-under60min-2count]',


        '[sudden-drops-watchout-mediumJump-initial-down]',
        '[sudden-drops-mediumJump-lunch-down20]',
        '[sudden-drops-!watchout-lunch-straightDown]',
        '[sudden-drops-watchout-majorJump-down-straightDown]',
        '[sudden-drops-!watchout-minorJump-down10-straightDown30]',
        '[sudden-drops-!watchout-dinner-straightDown30]',
        '[sudden-drops-!watchout-dinner-down30-straightDown]',

        '[sudden-drops-!watchout-majorJump-down]',
        '[sudden-drops-brunch-down15-straightDown30]',
        '[sudden-drops-minorJump-lunch]',
        '[sudden-drops-down20-!straightDown-bearish]',
        '[sudden-drops-mediumJump-down20-bearish]',
        '[sudden-drops-!watchout-!straightDown-bearish]',
        '[sudden-drops-minorJump-lunch]',
        '[sudden-drops-watchout-mediumJump-initial-down15-!straightDown]',
        '[sudden-drops-lunch-straightDown120]',

        '[sudden-drops-mediumJump-lunch]',
        '[sudden-drops-mediumJump-lunch-!straightDown]',
        '[sudden-drops-mediumJump-lunch-!straightDown]',


        '[sudden-drops-mediumJump-lunch-bearish]',
        '[sudden-drops-brunch-bearish]',
        '[sudden-drops-minorJump-straightDown30-bearish]',
        '[sudden-drops-!watchout-!straightDown-neutral]',
        '[sudden-drops-!watchout-down-neutral]',
        '[sudden-drops-initial-!straightDown-neutral]',
        '[sudden-drops-lunch-down10-bearish]',

    ],
    // forPurchaseVariation: '75Perc5Day-yesincludingblanks',
    // fallbackSellStrategy: 'limit8',
    disableMultipliers: false,
    force: {
        sell: [
        ],
        keep: [
            'ACIU',
            'UEPS',
            'MNGA'
        ]
    },
    // expectedPickCount
};
