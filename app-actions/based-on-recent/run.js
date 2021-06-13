const getBasedOnRecentPicks = require('./get-picks');
const { alpaca } = require('../../alpaca');
const attemptBuy = require('../../alpaca/attempt-buy');
const limitBuy = require('../../alpaca/limit-buy');
const alpacaCancelAllOrders = require('../../alpaca/cancel-all-orders');
const makeFundsAvailable = require('../../alpaca/make-funds-available');
const getMinutesFromOpen = require('../../utils/get-minutes-from-open');

const { registerNewStrategy } = require('../buys-in-progress');
const { uniq } = require('underscore');
// const alpacaMarketBuy = require('../../alpaca/market-buy');
const fakeMarketBuy = require('../../alpaca/fake-market-buy');

const runArray = [
    27,
    // limit .98
    // 49,
    70,
    // 80,
    // 120,
    // 152,
    183,
    // limit .99 yes fallbackmarket
    202, 
    // 240,
    // 271, 
    // 300,
    // 310,
    // 320,
    320,
    // attempt
    360,
    // 390,
    // after hours (390 - 510)
    // 401, 
    430, 458, 495
];


const getTicker = pick => pick.ticker;

const runBasedOnRecent = async skipSetPerc => {

    const { onlyUseCash, makeFundsForRecent = false } = await getPreferences();

    const stratManager = require('../../socket-server/strat-manager');    
    const getPs = stratManager ? stratManager.refreshBorRecs.bind(stratManager) : getBasedOnRecentPicks; 

    const picks = await getPs();
    strlog({
        picks
    })
    Object.entries(picks).forEach(([collection, specificPicks]) => {
        specificPicks.map(getTicker).forEach(ticker => {
            console.log(`registering ${collection} - ${ticker}`);
            registerNewStrategy(ticker, collection);
        });
    });


    const curMin = getMinutesFromOpen();
    const allToBuy = uniq(
        Object.values(picks).flat().filter(({ ticker }) => {
            const { percentOfBalance } = getRelatedPosition(ticker);
            const percLimit = curMin < 200 ? 1.5 : 4;
            const dontBuy = percentOfBalance > percLimit;
            return !dontBuy;
        }),
        false,
        p => p.ticker
    );
    await log(`all to buy: ${allToBuy.map(getTicker)}`);


    const account = await alpaca.getAccount();
    const { cash, buying_power, equity } = account;

    const allToBuyCount = allToBuy.length;
    let perBuy = 3;
    const amtNeeded = allToBuyCount * perBuy;
    await log(`runBasedOnRecent - perBuy $${perBuy}`);

    const amtLeft = Number(onlyUseCash ? cash : buying_power);
    console.log({ amtLeft, onlyUseCash, amtNeeded, allToBuyCount: allToBuy.length });
    
    if (amtLeft < amtNeeded) {
        // await log(`skipping recent picks purchase because amtLeft ${amtLeft} and amtNeeded ${amtNeeded}`);
        // return;
        const fundsNeeded = (amtNeeded * 1.1) - amtLeft;
        if (makeFundsForRecent) {
            await makeFundsAvailable(fundsNeeded);
            await log(`making $${fundsNeeded} available`);
        }
        const afterAccount = await alpaca.getAccount();
        const afterAmt = Number(onlyUseCash ? afterAccount.cash : afterAccount.buying_power);
        const logObj = { before: amtLeft, fundsNeeded, after: afterAmt };
        await log(`funds made available - before ${amtLeft}, after ${afterAmt}`, logObj);
        if (Number(afterAmt) < amtNeeded) {
            if (afterAmt < 20) {
                await log('sorry i tried to make funds available for run based on recent but there is still not enough.');
                return;
            } else {
                const origPerBuy = perBuy;
                perBuy = Math.round(afterAmt / allToBuyCount);
                await log(`didnt get everything I wanted but still enough to do something . originally ${origPerBuy} => now ${perBuy}`);
            }
        }
    }

    for (let { ticker, nowPrice } of allToBuy) {

        // prevent day trades!!
        const quantity = Math.ceil(perBuy / nowPrice) || 1;
        await log(`buying ${ticker} about $${Math.round(quantity * nowPrice)}`);
        await alpacaCancelAllOrders(ticker, 'sell');

        fakeMarketBuy({
            ticker,
            quantity,
        });
    }

    return allToBuy;
};

module.exports = {
    runBasedOnRecent,
    runArray
};