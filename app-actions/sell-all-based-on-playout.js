// steps
// 1. get list of current positions
// 2. look within the daily-transactions and find which day that stock was bought and which strategy was responsible for the purchase
// 3. look at the strat-perfs for the transaction
// 4. run the playoutFn (strategy-perf-multiple) related to the current settings.js fallbackSellStrategy on that list of breakdowns
// 5. sell all that are > 4 days old or the output of playoutFn shows that it hit the playout at some point


const fs = require('mz/fs');
const mapLimit = require('promise-map-limit');
const StratPerf = require('../models/StratPerf');

// utils
const jsonMgr = require('../utils/json-mgr');
const getFilesSortedByDate = require('../utils/get-files-sorted-by-date');
const getTrend = require('../utils/get-trend');
const sendEmail = require('../utils/send-email');

// app-actions
const detailedNonZero = require('./detailed-non-zero');
const activeSell = require('./active-sell');
const generatePlayouts = require('./generate-playouts');

// the magic
const {
  fallbackSellStrategy,
  sellAllStocksOnNthDay,
  force: { sell: forceSell }
} = require('../settings');
const playouts = require('../analysis/strategy-perf-multiple/playouts');

const determineSingleBestPlayoutFromMultiOutput = require(
    '../analysis/strategy-perf-multiple/one-off-scripts/determine-best-playout'
);

// do it

module.exports = async (dontActuallySellFlag) => {

    // helper action fns
    const sellPosition = async (pos, whySelling) => {
        const { ticker, quantity } = pos;
        console.log('ticler', pos.ticker, 'sumbol,', pos.symbol)
        console.log(`selling ${ticker} because ${whySelling}`);
        if (dontActuallySellFlag) return;
        const posData = [
            `breakdowns: ${pos.breakdowns}`,
            `playoutToRun: ${pos.playoutToRun}`,    
            `buyStrategy: ${pos.buyStrategy}`,
            `buyDate: ${pos.buyDate}`,
            `returnDollars: $${pos.returnDollars}`
        ];
        try {
            const response = await activeSell(
                { ticker, quantity }
            );
            console.log(`sold ${quantity} shares of ${ticker} because ${whySelling}`, response);
            await sendEmail(`sold ${ticker}`, posData.join('\n'));
        } catch (e) {
            console.log(`error selling ${pos.symbol}`, e);
            await sendEmail(`ERROR selling ${ticker}`, [
                ...posData,
                `error: ${e}`
            ].join('\n'));
        }
    };

    const dailyTransactionDates = await getFilesSortedByDate('daily-transactions');
    // console.log(dailyTransactionDates, 'dailyTransactionDates');
    // console.log(pmModelDates, 'pmModelDates');

    let nonzero = await detailedNonZero();

    const forceSells = nonzero.filter(pos => forceSell.includes(pos.symbol));
    nonzero = nonzero.filter(pos => !forceSell.includes(pos.symbol));

    await mapLimit(forceSells, 2, pos =>
        sellPosition(pos, `on force sell list in settings.js`)
    );

    // console.log(nonzero.length);

    nonzero.forEach(pos => {
        console.log(
            pos.symbol,
            pos.dayAge + ' days old'
        );
    });


    const handleOverNDays = async () => {
        // handle older than four days
        const olderThanNDays = nonzero.filter(pos => pos.dayAge >= sellAllStocksOnNthDay);
        await mapLimit(olderThanNDays, 1, pos =>
            sellPosition(pos, `older than ${sellAllStocksOnNthDay} days: ${pos.dayAge}`)
        );
    };

    const handleUnderNDays = async () => {
        // handle under four days (but not bought today) check for playout strategy
        let underNDays = nonzero
            .filter(pos => pos.dayAge >= 1 && pos.dayAge < sellAllStocksOnNthDay)
            .map(pos => ({
                ...pos,
                firstBuyStrategy: Array.isArray(pos.buyStrategy) ? pos.buyStrategy[0] : pos.buyStrategy
            }));
            
        // console.log({ underNDays });
        if (!underNDays.length) return;
        
        const strategiesToLookup = underNDays.map(pos => pos.firstBuyStrategy).filter(v => !!v);
        const highestPlayouts = strategiesToLookup.length ?
            await determineSingleBestPlayoutFromMultiOutput(
                                ...strategiesToLookup
            ) : [];
        console.log({ strategiesToLookup, highestPlayouts })
        underNDays = underNDays.map(pos => {
            const foundMatch = highestPlayouts.find(obj => obj.strategy === pos.firstBuyStrategy);
            return {
                ...pos,
                ...(foundMatch && { highestPlayout: foundMatch.highestPlayout })
            };
        });

        for (let pos of underNDays) {
            // const strategy = await findStrategyThatPurchasedTicker(pos.symbol);
            console.log('underndays', underNDays.length);
            // console.log(pos);
            const breakdowns = await generatePlayouts(pos.firstBuyStrategy, pos.buyDate) || [];
            breakdowns.push(
                getTrend(
                    pos.currentPrice,
                    pos.average_buy_price
                )
            );
            const playoutToRun = pos.highestPlayout || fallbackSellStrategy;
            // console.log({ breakdowns, highestPlayout: pos.highestPlayout, playoutToRun, buyStrategy: pos.buyStrategy })
            pos.playoutToRun = playoutToRun;
            const playoutFn = playouts[playoutToRun].fn;
            const { hitFn: hitPlayout } = playoutFn(breakdowns);
            pos.hitPlayout = hitPlayout;
            pos.breakdowns = breakdowns;
            console.log(pos.ticker, breakdowns, 'playout', playoutToRun, 'hitPlayout', hitPlayout);
        }

        // sell all under 4 days that hit the playoutFn
        await mapLimit(
            underNDays
                .filter(pos => pos.hitPlayout)
                .sort((a, b) => b.returnDollars - a.returnDollars), 
            2, 
            pos => sellPosition(pos, `hit ${pos.playoutToRun} playout`)
        );
    };


    await handleOverNDays();
    await handleUnderNDays();
    
    // await Promise.all([
    //     handleOverNDays(),
    //     handleUnderNDays()
    // ]);



};
