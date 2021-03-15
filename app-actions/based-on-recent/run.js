const getBasedOnRecentPicks = require('./get-picks');
const { alpaca } = require('../../alpaca');
const attemptBuy = require('../../alpaca/attempt-buy');
const alpacaCancelAllOrders = require('../../alpaca/cancel-all-orders');
const makeFundsAvailable = require('../../alpaca/make-funds-available');
const getMinutesFromOpen = require('../../utils/get-minutes-from-open');

const { registerNewStrategy } = require('../buys-in-progress');

const runArray = [
    25,
    49,
    80,
    120,
    152,
    183,
    202, 240,
    271, 300, 330, 370, 401, 430, 446
];

const setRecentBuyPerc = async () => {
    const account = await alpaca.getAccount();
    const { cash, buying_power, equity } = account;

    const { onlyUseCash } = await getPreferences();
    const buyingPower = Number(onlyUseCash ? cash : buying_power);

    const curMin = getMinutesFromOpen();

    const runAfter = runArray.filter(min => min >= curMin - 3); // include this one
    const runAfterCount = runAfter.length;

    const newRecentBuyAmt = buyingPower / runAfterCount;


    // curMin < 370
    //     ? 2.5
    //     : 
    let newRecentBuyPerc = newRecentBuyAmt / equity * 100;
    if (curMin < 370) {
        newRecentBuyPerc = newRecentBuyPerc * 0.8
    }
    newRecentBuyPerc = Math.ceil(newRecentBuyPerc);

    const prefs = await getPreferences();
    prefs.recentBuyPerc = newRecentBuyPerc;
    console.log({
        runAfter,
        buyingPower,
        prefs,
        newRecentBuyPerc
    });
    await log(`setting recent buy perc to ${newRecentBuyPerc}% ($${Math.round(newRecentBuyAmt)}) because runAfterCount ${runAfterCount} and buyingPower ${buyingPower} and equity ${equity}`)
    await savePreferences(prefs);
};


const getTicker = pick => pick.ticker;

const runBasedOnRecent = async skipSetPerc => {
    
    if (!skipSetPerc) await setRecentBuyPerc();

    const { onlyUseCash, recentBuyPerc, makeFundsForRecent = false } = await getPreferences();   // recentBuyPerc = total to buy per run not per stock
    if (recentBuyPerc < 1) {
        await log('sorry not enough to buy with');
        return;
    }

    const stratManager = require('../../socket-server/strat-manager');    
    const getPs = stratManager ? stratManager.refreshBorRecs.bind(stratManager) : getBasedOnRecentPicks; 

    const picks = await getPs();
    Object.entries(picks).forEach(([collection, specificPicks]) => {
        specificPicks.map(getTicker).forEach(ticker => {
            console.log(`registering ${collection} - ${ticker}`);
            registerNewStrategy(ticker, collection);
        });
    });


    const allToBuy = Object.values(picks).flat();
    await log(`all to buy: ${allToBuy.map(getTicker)}`);



    const account = await alpaca.getAccount();
    const { cash, buying_power, equity } = account;

    const recentBuyAmt = Math.round(equity * recentBuyPerc / 100);
    const amtNeeded = recentBuyAmt;
    const allToBuyCount = allToBuy.length;
    let perBuy = Math.round(recentBuyAmt / allToBuyCount);
    await log(`runBasedOnRecent - recentBuyAmt: $${recentBuyAmt} bc equity $${equity} & recentBuyPerc ${recentBuyPerc}%.... perBuy $${perBuy}`);


    const amtLeft = Number(onlyUseCash ? cash : buying_power);
    console.log({ amtLeft, onlyUseCash, amtNeeded, allToBuyCount: allToBuy.length, recentBuyAmt });
    
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
        await alpacaCancelAllOrders(ticker, 'sell');

        const quantity = Math.round(perBuy / nowPrice) || 1;
        console.log({
            ticker,
            nowPrice,
            quantity
        });

        await log(`buying ${ticker} about $${Math.round(quantity * nowPrice)}`);
        attemptBuy({
            ticker,
            quantity,
            fallbackToMarket: true
        });
    }


    return allToBuy;
};

module.exports = {
    runBasedOnRecent,
    runArray
}