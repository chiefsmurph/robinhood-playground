const { alpaca } = require('../alpaca');
const getRecentPicks = require('./get-recent-picks');
const getStSentiment = require('../utils/get-stocktwits-sentiment');
const attemptBuy = require('../alpaca/attempt-buy');
const alpacaCancelAllOrders = require('../alpaca/cancel-all-orders');
const makeFundsAvailable = require('../alpaca/make-funds-available');
const Log = require('../models/Log');
const { get } = require('underscore');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');


const { registerNewStrategy } = require('./buys-in-progress');

const runArray = [
    // 9,
    // 49, 80, 120, 152, 183, 202, 240, 
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
    const newRecentBuyPerc = curMin < 370
        ? 2.5
        : Math.ceil(newRecentBuyAmt / equity * 100);

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

const runBasedOnRecent = async (skipSetPerc) => {
    
    if (!skipSetPerc) await setRecentBuyPerc();

    const getTicker = pick => pick.ticker;
    const recentPicks = await getRecentPicks(300);


    // ANYTHING DROPPED 20%
    let trendDownBig = recentPicks.filter(pick => pick.trend < -20);
    trendDownBig.map(getTicker).forEach(ticker => registerNewStrategy(ticker, 'trendDownBig'));
    await log(`trendDownBig: ${trendDownBig.map(getTicker)}`);

    // DAILY RSI BELOW 30
    const getRSI = pick => get(pick.scan, 'computed.dailyRSI', 100);
    let rsiOversold = recentPicks
        .sort((a, b) => getRSI(a) - getRSI(b))  // ascending - lowest first
        .filter(pick => getRSI(pick) < 30);
    if (rsiOversold.length > 6) {
        await log(`too many rsiOversold something is up, resetting`, { rsiOversold});
        rsiOversold = [];
    }
    rsiOversold.map(getTicker).forEach(ticker => registerNewStrategy(ticker, 'rsiOversold'));
    await log(`rsiOversold: ${rsiOversold.map(getTicker)}`);
    

    // ALSO ANYTHING BETWEEN -1 to 15% TRENDING AND HIGH ST (>100 BULLBEARSCORE)
    const readyToGo = recentPicks.filter(pick => pick.trend < 15 && getRSI(pick) < 70);
    // console.log(`readyToGo: ${readyToGo.map(getTicker)}`);


    const getSt = pick => pick.stSent.bullBearScore;

    
    const withStSent = (
        await mapLimit(readyToGo, 3, async pick => ({
            ...pick,
            stSent: await getStSentiment(pick.ticker)
        }))
    ).sort((a, b) => getSt(b) - getSt(a));



    await log(
        withStSent.map(pick => [pick.ticker, getSt(pick)].join(': '))
    );



    const readyToGoAndHighSt = withStSent
        .filter(pick => getSt(pick) > 300)
        .sort((a, b) => getSt(b) - getSt(a))
        .slice(0, 5);
    readyToGoAndHighSt.map(getTicker).forEach(ticker => registerNewStrategy(ticker, 'readyToGoAndHighSt'));
    await log(`readyToGoAndHighSt: ${readyToGoAndHighSt.map(getTicker)}`);


    const topSt = readyToGoAndHighSt.shift();
    topSt && await log(`topSt: ${getTicker(topSt)} @ ${getSt(topSt)}`);
    registerNewStrategy(getTicker(topSt), 'topSt');
    const allToBuy = [
        ...trendDownBig,
        ...rsiOversold,
        ...readyToGoAndHighSt,
        ...topSt ? [topSt] : []
    ];

    await log(`all to buy: ${allToBuy.map(getTicker)}`);



    const { onlyUseCash, recentBuyPerc, makeFundsForRecent = false } = await getPreferences();   // recentBuyPerc = total to buy per run not per stock
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