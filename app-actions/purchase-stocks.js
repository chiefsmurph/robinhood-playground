const limitBuyMultiple = require('./limit-buy-multiple');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
let { expectedPickCount, purchaseAmt, disableMakeFundsAvailable, onlyUseCash, makeFundsOnlyForDowners } = require('../settings');
const { alpaca } = require('../alpaca');
const makeFundsAvailable = require('../alpaca/make-funds-available');
const sendEmail = require('../utils/send-email');

const purchaseStocks = async ({ strategy, multiplier = 1, min, withPrices } = {}, dontBuy) => {

    const account = await alpaca.getAccount();
    const { portfolio_value, cash, buying_power, long_market_value } = account;

    purchaseAmt = purchaseAmt || Math.ceil(portfolio_value / expectedPickCount);
    const amountPerBuy = purchaseAmt * multiplier;
    strlog({
        purchaseAmt,
        multiplier,
        amountPerBuy,
    });


    const amtLeft = Number(onlyUseCash ? cash : buying_power);


    if (disableMakeFundsAvailable && amountPerBuy * 1.3 > amtLeft) {
        return log(`WANTED TO BUY ${withPrices.map(b => b.ticker).join(' and ')} BUT YOU ARE OUT OF MONEY`);
    }

    const totalAmtToSpend = amountPerBuy;//disableCashCheck ?  : Math.min(amountPerBuy, cash);
    strlog({
        totalAmtToSpend,
        amtLeft,
        strategy
    });

    if (totalAmtToSpend * 1.3 > cash) {
        // time to make some funds available

        if (makeFundsOnlyForDowners && !strategy.includes('avg-downer')) {
            return log('WARNING: WANTED TO MAKE FUNDS AVAILABLE BUT ONLY MAKING FUNDS AVAILABLE FOR AVG DOWNERS');
        }
        if (disableMakeFundsAvailable) {
            return log('WARNING: TRIED TO PURCHASE, BUT YOU ARE OUT OF MONEY AND MAKE FUNDS AVAILABLE IS DISABLED', {
                strategy,
                withPrices
            });
        }
        const fundsNeeded = (totalAmtToSpend * 1.3) - amtLeft;
        await makeFundsAvailable(fundsNeeded);
        const afterCash = (await alpaca.getAccount()).cash;
        const logObj = { before: cash, fundsNeeded, after: afterCash };
        await log('funds made available', logObj);
        await sendEmail('funds made available', JSON.stringify(logObj, null, 2));
    }

    if (dontBuy) return;

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
