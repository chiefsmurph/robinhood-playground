const limitBuyMultiple = require('./limit-buy-multiple');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
let { expectedPickCount } = require('../settings');
const { alpaca } = require('../alpaca');
const makeFundsAvailable = require('../alpaca/make-funds-available');
const sendEmail = require('../utils/send-email');

const purchaseStocks = async ({ strategy, multiplier = 1, min, withPrices } = {}, dontBuy) => {

    const account = await alpaca.getAccount();
    const { portfolio_value, cash, buying_power, long_market_value, maintenance_margin, equity } = account;

    const { onlyUseCash, purchaseAmt = Math.ceil(portfolio_value / expectedPickCount), makeFundsOnlyForDowners } = await getPreferences();
    const amountPerBuy = purchaseAmt * multiplier;
    strlog({
        purchaseAmt,
        multiplier,
        amountPerBuy,
    });

    let amtLeft = Number(onlyUseCash ? cash : buying_power);
    if (getMinutesFromOpen() > 360 && onlyUseCash) {
        // use all maintenance_margin if after hours
        const origAmt = amtLeft;
        const newAmtLeft = (Number(equity) - Number(maintenance_margin)) * 0.7;
        await log(`after hours so lets use the full maintenance margin - before ${origAmt} and now ${newAmtLeft}`);
        amtLeft = newAmtLeft;
    }

    let totalAmtToSpend = amountPerBuy;//disableCashCheck ?  : Math.min(amountPerBuy, cash);
    strlog({
        totalAmtToSpend,
        amtLeft,
        strategy
    });

    if (totalAmtToSpend * 1.3 > amtLeft) {
        // time to make some funds available
        

        if (makeFundsOnlyForDowners && !strategy.includes('avg-downer')) {
            return log('WARNING: WANTED TO MAKE FUNDS AVAILABLE BUT ONLY MAKING FUNDS AVAILABLE FOR AVG DOWNERS');
        }
        // if (disableMakeFundsAvailable) {
        //     return log('WARNING: TRIED TO PURCHASE, BUT YOU ARE OUT OF MONEY AND MAKE FUNDS AVAILABLE IS DISABLED', {
        //         strategy,
        //         withPrices
        //     });
        // }
        const fundsNeeded = (totalAmtToSpend * 1.3) - amtLeft;
        await makeFundsAvailable(fundsNeeded);
        await log(`making $${fundsNeeded} available`);
        const afterAccount = await alpaca.getAccount();
        const afterAmt = Number(onlyUseCash ? afterAccount.cash : afterAccount.buying_power);
        const logObj = { before: amtLeft, fundsNeeded, after: afterAmt };
        await log(`funds made available - before ${amtLeft}, after ${afterAmt}`, logObj);
        if (Number(afterAmt) < totalAmtToSpend) {
            console.log('sorry i tried to make funds available but there is still not enough. going to buy what i can.');
            totalAmtToSpend = amtLeft * 0.9;
        }
    }

    if (dontBuy) return log('DONT BUY', dontBuy);

    // const totalAmtToSpend = cashAvailable * ratioToSpend;

    
    // console.log('multiplier', multiplier, 'amountPerBuy', amountPerBuy, 'totalAmtToSpend', totalAmtToSpend);

    // if (totalAmtToSpend < 10) {
    //     return console.log('not purchasing less than $10 to spend', strategy);
    // }


    // console.log('actually purchasing', strategy, 'count', stocksToBuy.length);
    // console.log('ratioToSpend', ratioToSpend);
    // console.log({ stocksToBuy, totalAmtToSpend });
    await limitBuyMultiple({
        totalAmtToSpend,
        strategy,
        min,
        withPrices,
    });
};

module.exports = purchaseStocks;
