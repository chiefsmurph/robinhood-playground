// analysis
const stratPerfMultiple = require('../analysis/strategy-perf-multiple');

// app actions
// const getTrendAndSave = require('../app-actions/get-trend-and-save');
// const logPortfolioValue = require('../app-actions/log-portfolio-value');
const { default: recordStratPerfs } = require('../app-actions/record-strat-perfs');
// const doubleDown = require('../app-actions/double-down');

// const sellAllOlderThanTwoDays = require('../app-actions/sell-all-older-than-two-days');
// const sellAllBasedOnPlayout = require('../app-actions/sell-all-based-on-playout');
// const sellAllIfWentUp = require('../app-actions/sell-all-if-went-up');
const alpacaSellAllStocks = require('../alpaca/sell-all-stocks');
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

const additionalCron = [
    // {
    //     name: 'alpacaPreMarketSells',
    //     run: [-],
    //     fn: () => alpacaSellAllStocks()
    // },
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
        name: 'alpacaActOnPositions',
        run: [-25, 220, 365],
        fn: () => alpacaActOnPositions()
    },

    {
        name: 'alpacaSellOnOpen',
        run: [15],
        fn: () => alpacaSellOnOpen()
    },

    {
        name: 'alpacaHopefulSells',
        run: [-25, 20, 120, 240, 291],
        fn: () => alpacaHopefulSells()
    },

    // {
    //     name: 'alpacaMostLow',
    //     run: [
    //         //16,
    //         389
    //     ],
    //     fn: () => alpacaMostLow()
    // },
    {
        name: 'alpaca smart sells',
        run: [145, 263],
        // run: [5, 24, 45, 60, 100, 140, 180, 220, 280, 300],
        fn: () => alpacaSmartSells()
    },


    // {
    //     name: 'alpaca sell all stocks',
    //     run: [0],
    //     fn: () => {
    
    //         setTimeout(async () => {
    //             // daily at 6:30AM + 4 seconds
    //             await alpacaSellAllStocks();
    //             await log('done selling all');
    //         }, 4000);
    
    //     }
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
    //sellAllOlderThanTwoDays
    // {
    //     name: 'sell all if older than one day',
    //     run: [45],
    //     fn: sellAllOlderThanTwoDays
    // },
    {
        name: 'getAllTickers',
        run: [1027, 70, 200],
        fn: getAllTickers
    },

    {
        name: 'afterhours buys',
        run: [389, 420, 450, 480],
        fn: afterHoursBuys
    },

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

    {
        name: 'send day screenshot',
        run: [390],
        fn: () => sendScreenshot()
    },

    {
        name: 'strat perf multiple',    // the big analyze all strategies function
        run: [520],
        fn: () => stratPerfMultiple(25, 'fourth-day-9')
    },

    {
        name: 'restart pm2 process',
        run: [700],
        fn: restartProcess
    },

    // {
    //     name: 'commit strat-perf-multiple to git'
    // }


];

module.exports = additionalCron;
