const { alpaca } = require('../alpaca');
const getRecentPicks = require('./get-recent-picks');
const getStSentiment = require('../utils/get-stocktwits-sentiment');
const attemptBuy = require('../alpaca/attempt-buy');
const alpacaCancelAllOrders = require('../alpaca/cancel-all-orders');
const makeFundsAvailable = require('../alpaca/make-funds-available');
const Log = require('../models/Log');
const { get } = require('underscore');



const { registerNewStrategy } = require('./buys-in-progress');




module.exports = async () => {
    

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
    

    // ALSO ANYTHING BELOW 3% TRENDING AND HIGH ST (>100 BULLBEARSCORE)
    const onlyDown = recentPicks.filter(pick => pick.trend < 3);
    // console.log(`onlyDown: ${onlyDown.map(getTicker)}`);


    const getSt = pick => pick.stSent.bullBearScore;

    
    const withStSent = (
        await mapLimit(onlyDown, 3, async pick => ({
            ...pick,
            stSent: await getStSentiment(pick.ticker)
        }))
    ).sort((a, b) => getSt(b) - getSt(a));



    await log(
        withStSent.map(pick => [pick.ticker, getSt(pick)].join(': '))
    );



    const downAndHighSt = withStSent
        .filter(pick => getSt(pick) > 100)
        .sort((a, b) => getSt(b) - getSt(a))
        .slice(0, 12);
    downAndHighSt.map(getTicker).forEach(ticker => registerNewStrategy(ticker, 'downAndHighSt'));
    await log(`downAndHighSt: ${downAndHighSt.map(getTicker)}`);


    const topSt = downAndHighSt.shift();
    topSt && await log(`topSt: ${getTicker(topSt)} @ ${getSt(topSt)}`);
    registerNewStrategy(getTicker(topSt), 'topSt');
    const allToBuy = [
        ...trendDownBig,
        ...rsiOversold,
        ...downAndHighSt,
        ...topSt ? [topSt] : []
    ];

    await log(`all to buy: ${allToBuy.map(getTicker)}`);

    const account = await alpaca.getAccount();
    const { cash, buying_power, equity } = account;

    const { onlyUseCash, recentBuyPerc } = await getPreferences();   // recentBuyPerc = total to buy per run not per stock


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
        await makeFundsAvailable(fundsNeeded);
        await log(`making $${fundsNeeded} available`);
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
}