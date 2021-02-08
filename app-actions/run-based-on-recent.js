const { alpaca } = require('../alpaca');
const getRecentPicks = require('./get-recent-picks');
const getStSentiment = require('../utils/get-stocktwits-sentiment');
const attemptBuy = require('../alpaca/attempt-buy');
const alpacaCancelAllOrders = require('../alpaca/cancel-all-orders');
const makeFundsAvailable = require('../alpaca/make-funds-available');
const Log = require('../models/Log');


module.exports = async () => {


    const getTicker = pick => pick.ticker;
    const recentPicks = await getRecentPicks(300);


    // ANYTHING DROPPED 20%
    const trendDownBig = recentPicks.filter(pick => pick.trend < -20);
    await log(`trendDownBig: ${trendDownBig.map(getTicker)}`);

    // DAILY RSI BELOW 30
    const rsiOversold = recentPicks.filter(pick => pick.scan.computed.dailyRSI < 30);
    await log(`rsiOversold: ${rsiOversold.map(getTicker)}`);
    

    // ALSO ANYTHING BELOW 3% TRENDING AND HIGH ST (>100 BULLBEARSCORE)
    const onlyDown = recentPicks.filter(pick => pick.trend < 3);
    console.log(`onlyDown: ${onlyDown.map(getTicker)}`);
    const withStSent = await mapLimit(onlyDown, 3, async pick => ({
        ...pick,
        stSent: await getStSentiment(pick.ticker)
    }));
    const downAndHighSt = withStSent.filter(pick => pick.stSent.bullBearScore > 100);

    await log(`downAndHighSt: ${downAndHighSt.map(getTicker)}`);
    const allToBuy = [
        ...trendDownBig,
        ...rsiOversold,
        ...downAndHighSt
    ];

    await log(`all to buy: ${allToBuy.map(getTicker)}`);


    const account = await alpaca.getAccount();
    const { cash, buying_power } = account;

    const { onlyUseCash, recentBuyAmt } = await getPreferences();
    const amtLeft = Number(onlyUseCash ? cash : buying_power);
    const amtNeeded = allToBuy.length * recentBuyAmt * 1.1;

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
            console.log('sorry i tried to make funds available but there is still not enough. going to buy what i can.');
            return;
        }
    }

    for (let { ticker, nowPrice } of allToBuy) {
        // prevent day trades!!
        await alpacaCancelAllOrders(ticker, 'sell');

        const quantity = Math.round(recentBuyAmt / nowPrice) || 1;
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