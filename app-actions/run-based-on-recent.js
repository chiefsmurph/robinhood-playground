const { alpaca } = require('../alpaca');
const getRecentPicks = require('./get-recent-picks');
const getStSentiment = require('../utils/get-stocktwits-sentiment');
const attemptBuy = require('../alpaca/attempt-buy');
const alpacaCancelAllOrders = require('../alpaca/cancel-all-orders');
const Log = require('../models/Log');


module.exports = async () => {


    const getTicker = pick => pick.ticker;
    const recentPicks = await getRecentPicks(300, true, false, true);


    // ANYTHING DROPPED 20%
    const definiteBuys = recentPicks.filter(pick => pick.trend < -20);
    await log(`definite buys: ${definiteBuys.map(getTicker)}`);
    


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
        ...definiteBuys,
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
        await log(`skipping recent picks purchase because amtLeft ${amtLeft} and amtNeeded ${amtNeeded}`);
        return;
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