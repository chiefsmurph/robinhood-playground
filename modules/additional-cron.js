
const { alpaca } = require('../alpaca');

// analysis
const stratPerfMultiple = require('../analysis/strategy-perf-multiple');

// app actions
// const getTrendAndSave = require('../app-actions/get-trend-and-save');
// const logPortfolioValue = require('../app-actions/log-portfolio-value');
const { default: recordStratPerfs } = require('../app-actions/record-strat-perfs');
const { runBasedOnRecent, runArray: basedOnRecentRunArray } = require('../app-actions/based-on-recent/run');
const sendReportBasedOnRecent = require('../app-actions/based-on-recent/send-report');
// const doubleDown = require('../app-actions/double-down');

// const sellAllOlderThanTwoDays = require('../app-actions/sell-all-older-than-two-days');
// const sellAllBasedOnPlayout = require('../app-actions/sell-all-based-on-playout');
// const sellAllIfWentUp = require('../app-actions/sell-all-if-went-up');

const alpacaCancelAllOrders = require('../alpaca/cancel-all-orders');
const alpacaSellAllStocks = require('../alpaca/sell-all-stocks');
const alpacaPremarketSells = require('../alpaca/premarket-sells');
// const smartSells = require('../app-actions/smart-sells');
const alpacaActOnPositions = require('../alpaca/act-on-positions');
const alpacaContinueDown = require('../alpaca/continue-down');
const alpacaMostLow = require('../alpaca/most-low');
const alpacaSmartSells = require('../alpaca/smart-sells');
const alpacaSellOnOpen = require('../alpaca/sell-on-open');
const alpacaHopefulSells = require('../alpaca/hopeful-sells');

// const saveDayReport = require('../app-actions/save-day-report');
const restartProcess = require('../app-actions/restart-process');
const sendScreenshot = require('../app-actions/send-screenshot');
const afterHoursBuys = require('../app-actions/afterhours-buys');

// utils
// const regCronIncAfterSixThirty = require('../utils/reg-cron-after-630');
// const timeoutPromise = require('../utils/timeout-promise');

// rh actions
const getAllTickers = require('../rh-actions/get-all-tickers');

// socket-server
const stratManager = require('../socket-server/strat-manager');
const saveByDateAnalysis = require('../analysis/positions/save-bydate-analysis');
const makeFundsAvailable = require('../alpaca/make-funds-available');

const additionalCron = [



    // ADMIN

    // {
    //     name: 'alpacaContinueDown',
    //     run: [1],
    //     fn: () => setTimeout(() => alpacaContinueDown(), 3000)
    // },

    {
        name: 'saveByDateAnalysis',
        run: [-30, 30, 130, 230, 330, 400, 600],
        fn: () => saveByDateAnalysis()
    },

    {
        name: 'sendReportBasedOnRecent',
        run: [328],
        fn: () => sendReportBasedOnRecent(false)
    },

    {
        name: 'getAllTickers',
        run: [1027, 70, 200],
        fn: getAllTickers
    },

    {
        name: 'record-strat-perfs, refresh past data',
        run: [9],
        fn: async min => {
            await recordStratPerfs(min);
            await stratManager.refreshPastData();
        }
    },
    {
        name: 'record-strat-perfs',
        run: [85, 230, 330],
        fn: async (min) => {
            await recordStratPerfs(min);
            // await sellAllBasedOnPlayout();
        }
    },



    {
        name: 'send day screenshot',
        run: [390],
        fn: () => sendScreenshot()
    },

    {
        name: 'strat perf multiple',    // the big analyze all strategies function
        run: [520],
        fn: () => stratPerfMultiple(25, 0, 'fourth-day-9')
    },

    {
        name: 'restart pm2 process',
        run: [700],
        fn: restartProcess
    },





    // SELLING


    {
        name: 'alpacaPreMarketSells',
        run: [
            -30,
            // -22,
            // -16,
            // -8
        ],
        fn: () => alpacaPremarketSells()
    },


    // SELLING AT OPEN


    {
        name: 'alpacaSellOnOpen',
        run: [-18],
        fn: () => alpacaSellOnOpen()
    },


    // {
    //     name: 'make funds available sell 5 percent of equity',
    //     run: [10],
    //     fn: async () => {
    //         const { equity } = await alpaca.getAccount();
    //         const PERCENT_TO_LIQUIDATE = 2;
    //         const amt = Math.round(equity * (PERCENT_TO_LIQUIDATE / 100));
    //         await log(`going to make funds available: $${amt} or about ${PERCENT_TO_LIQUIDATE}% of $${equity}`);
    //         await makeFundsAvailable(amt);
    //     }
    // },


    // {
    //     name: 'make funds available get buying power to 40% of equity',
    //     run: [105],
    //     fn: async () => {
    //         const { equity, cash, buying_power } = await alpaca.getAccount();
    //         const oneThirdOfEquity = equity * 40 / 100;
    //         const amtLeft = Number(getPreferences().onlyUseCash ? cash : buying_power);
    //         const amt = Math.round(oneThirdOfEquity - amtLeft);
    //         await log(`going to make funds available: $${amt} because oneThirdOfEquity $${oneThirdOfEquity} and amtLeft $${amtLeft}`);
    //         await makeFundsAvailable(amt);
    //     }
    // },


    // {
    //     name: 'alpaca sell all stocks',
    //     run: [4, 170],
    //     fn: () => alpacaSellAllStocks()
    // },



    // {
    //     name: 'alpacaActOnPositions',
    //     run: [22, 220, 365],
    //     fn: () => alpacaActOnPositions()
    // },


    // {
    //     name: 'alpaca smart sells',
    //     run: [30, 55, 145, 200, 263, 300, 340],
    //     // run: [5, 24, 45, 60, 100, 140, 180, 220, 280, 300],
    //     fn: () => alpacaSmartSells()
    // },

    // this is good ! for nighttrading
    {
        name: 'alpacaHopefulSells',
        run: [-25, -20, -14, -9, -4, 5, 12, 20, 25, 30, 35, 45, 60, 80, 95, 120, 140, 160, 240, 291],
        fn: () => alpacaHopefulSells()
    },







    // BUYING


    {
        name: 'runBasedOnRecent',
        run: basedOnRecentRunArray,
        fn: async min => {
            if (min > 290) {
                await alpacaCancelAllOrders(undefined, 'buy');
            }
            runBasedOnRecent()
        },
    },



    {
        name: 'afterhours buys',
        run: [
            386,
            // 420, 
            455, 480
        ],
        fn: afterHoursBuys
    },




    // {
    //     name: 'alpacaMostLow',
    //     run: [
    //         //16,
    //         389
    //     ],
    //     fn: () => alpacaMostLow()
    // },

    // {
    //     name: 'smartSells',
    //     run: [5, 24, 45, 60, 100, 140, 180, 220, 280, 300].map(n => n + 5),
    //     fn: smartSells
    // },
    // sell all if went up
    // {
    //     name: 'sellAllIfWentUp',
    //     run: [1],
    //     fn: sellAllIfWentUp
    // },
    // sell all based on playout
    // {
    //     name: 'sellAllBasedOnPlayout',
    //     run: [0, 35],
    //     fn: () => sellAllBasedOnPlayout()
    // },

    // sell all if went up
    // {
    //     name: 'sellAllStocks',
    //     run: [0],   // 12pm
    //     fn: sellAllStocks
    // },
    // log port value
    // {
    //     name: 'log the portfolio value',
    //     run: [195, 292],
    //     fn: logPortfolioValue
    // },
    // log the trend
    // {
    //     name: 'log the trend',
    //     run: [75, 105, 180],
    //     fn: getTrendAndSave
    // },
    // record prev day strat performances,
    //sellAllOlderThanTwoDays
    // {
    //     name: 'sell all if older than one day',
    //     run: [45],
    //     fn: sellAllOlderThanTwoDays
    // },


    // {
    //     name: 'doubleDown',
    //     run: [100, 200, 378],
    //     fn: (min) => doubleDown(min, min == 378 ? 7 : 3.5)
    // },

    // {
    //     name: 'commit day to git',
    //     run: [1027],
    //     fn: getAllTickers
    // },
    // {
    //     name: 'send day report',
    //     run: [400],
    //     fn: saveDayReport
    // },

    // {
    //     name: 'commit strat-perf-multiple to git'
    // }


];

module.exports = additionalCron;
