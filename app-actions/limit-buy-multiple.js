const simpleBuy = require('./simple-buy');

const alpacaMarketBuy = require('../alpaca/market-buy');
const alpacaLimitBuy = require('../alpaca/limit-buy');
const alpacaAttemptBuy = require('../alpaca/attempt-buy');
const alpacaCancelAllOrders = require('../alpaca/cancel-all-orders');

const mapLimit = require('promise-map-limit');
const sendEmail = require('../utils/send-email');
const lookup = require('../utils/lookup');
const Holds = require('../models/Holds');
const { alpaca } = require('../alpaca');
const getBalance = require('../alpaca/get-balance');


const getFillPriceFromResponse = response => {
    const order = response && response.alpacaOrder ? response.alpacaOrder : response;
    return (order || {}).filled_avg_price;
};

const executeBuys = async ({
    ticker,
    quantity,
    pickPrice,
    buyStyles
} = {}) => {

    if (!ticker || !quantity || !pickPrice || !buyStyles || !buyStyles.length) {
        throw new Error(`you did not give me enough info to buy, ${JSON.stringify({
            ticker,
            quantity,
            pickPrice,
            buyStyles
        })}`)
    }

    const totalDollars = pickPrice * quantity;
    const sliceCount = Math.min(Math.floor(totalDollars / 4) || 1, buyStyles.length);
    const individualQuantity = Math.floor(quantity / sliceCount) || 1;
    console.log({
        totalDollars,
        sliceCount,
        individualQuantity,
        quantity
    })

    const buyPromises = buyStyles
        .slice(0, sliceCount)
        .map(
            async ({ method, name = method.name, ...rest }) => {
                console.log(`${name}: purchasing ${individualQuantity} shares of ${ticker}`);
                // await new Promise(resolve => setTimeout(resolve, 1000 * Math.random() * 10))
                const response = await method({
                    ticker,
                    quantity: individualQuantity,
                    ...rest
                });
                return {
                    name,
                    fillPrice: getFillPriceFromResponse(response),
                    ...response
                };
            }
        );

    const roundUp = await Promise.all(buyPromises);

    return { 
        roundUp, 
        totalDollars,
        sliceCount,
        individualQuantity,
        quantity,
        pickPrice,
    };
    
};



const eclecticBuy = async ({
    ticker,
    quantity,
    pickPrice
}) => 
    executeBuys({
        ticker,
        quantity,
        pickPrice,
        buyStyles: [
            // {
            //     method: async (...args) => {
            //         await new Promise(resolve => setTimeout(resolve, 60000 * 3))
            //         return alpacaMarketBuy(...args);
            //     },
            //     name: 'marketBuy',
            // },
            // {
            //     method: alpacaLimitBuy,
            //     name: 'limitu2',
            //     limitPrice: pickPrice * 1.02,
            //     timeoutSeconds: 60 * 30,
            //     fallbackToMarket: false
            // },
            {
                method: alpacaLimitBuy,
                name: 'limitu1',
                limitPrice: pickPrice * 1.01,
                timeoutSeconds: 60 * 30,
                fallbackToMarket: false
            },
            {
                method: alpacaLimitBuy,
                name: 'limit100',
                limitPrice: pickPrice * 1.00,
                timeoutSeconds: 60 * 30,
                fallbackToMarket: false
            },
            {
                method: alpacaLimitBuy,
                name: 'limitd1',
                limitPrice: pickPrice * .99,
                timeoutSeconds: 60 * 30,
                fallbackToMarket: false
            },
            {
                method: alpacaLimitBuy,
                name: 'limitd2',
                limitPrice: pickPrice * .98,
                timeoutSeconds: 60 * 30,
                fallbackToMarket: false
            },
            {
                method: alpacaLimitBuy,
                name: 'limitd3',
                limitPrice: pickPrice * .97,
                timeoutSeconds: 60 * 30,
                fallbackToMarket: false
            },
            {
                method: alpacaLimitBuy,
                name: 'limitd4',
                limitPrice: pickPrice * .96,
                timeoutSeconds: 60 * 30,
                fallbackToMarket: false
            },
            // {
            //     method: alpacaAttemptBuy,
            //     name: 'attemptBuy',
            //     pickPrice,
            //     fallbackToMarket: true
            // }
        ]
    });

// const waitedSprayBuy = async ({
//     ticker,
//     quantity,
//     pickPrice
// }) => {
//     const totalDollars = quantity * pickPrice;
//     const waitAmts = [
//         1, 
//         15, 
//         // 150
//     ].slice(0, Math.floor(totalDollars / 6));
//     const perSpray = Math.round(quantity / waitAmts.length) || 1;
//     console.log('before sprays', { quantity, totalDollars });
//     const sprayResponses = await Promise.all(
//         waitAmts.map(
//             async waitAmt => {
//                 console.log(`waiting ${waitAmt} seconds and then spraying ${perSpray} quantity`);
//                 await new Promise(resolve => setTimeout(resolve, waitAmt * 1000));
//                 return {
//                     ...await sprayBuy({
//                         ticker,
//                         quantity: perSpray,
//                         pickPrice
//                     }),
//                     waitAmt
//                 };
//             }
//         )
//     );
    
//     return sprayResponses;
// };

const simpleLimitBuy = async ({
    ticker,
    quantity,
    pickPrice
}) => 
    executeBuys({
        ticker,
        quantity,
        pickPrice,
        buyStyles: [
            {
                method: alpacaLimitBuy,
                name: 'simple99',
                limitPrice: pickPrice * 0.99,
                timeoutSeconds: 60 * 30,
                fallbackToMarket: false
            },
            {
                method: alpacaLimitBuy,
                name: 'simple98',
                limitPrice: pickPrice * 0.98,
                timeoutSeconds: 60 * 30,
                fallbackToMarket: false
            },
        ]
    });


module.exports = async ({
    totalAmtToSpend,
    strategy,
    maxNumStocksToPurchase, 
    min, 
    withPrices,
} = {}) => {

    let stocksToBuy = withPrices.map(obj => obj.ticker);
    // you cant attempt to purchase more stocks than you passed in
    // console.log(maxNumStocksToPurchase, 'numstockstopurchase', stocksToBuy.length);
    maxNumStocksToPurchase = maxNumStocksToPurchase ? Math.min(stocksToBuy.length, maxNumStocksToPurchase) : stocksToBuy.length;

    let numPurchased = 0;

    // randomize the order
    stocksToBuy = stocksToBuy.sort(() => Math.random() > Math.random());
    // let amtToSpendLeft = totalAmtToSpend;
    let failedStocks = [];


    const perStock = strategy.includes('average-down-recommendation')
        ? totalAmtToSpend / 2.7
        : totalAmtToSpend;

    await mapLimit(stocksToBuy, 3, async ticker => {       // 3 buys at a time

            
        // dont buy stocks if more than 40 percent of current balance!
        let currentValue, percOfBalance = 0;
        try {
            currentValue = (await alpaca.getPosition(ticker)).market_value;
            const balance = await getBalance();
            percOfBalance = currentValue / balance * 100;
        } catch (e) {}
        if (percOfBalance > 40) {
            return console.log(`NOT PURCHASING ${ticker} because ${percOfBalance}% of balance`);
        }
        console.log({ percOfBalance, ticker })

        // for now same amt each stock
        //amtToSpendLeft / (maxNumStocksToPurchase - numPurchased);
        try {



            // prevent day trades!!
            await alpacaCancelAllOrders(ticker, 'sell');


            const pickPrice = (withPrices.find(obj => obj.ticker === ticker) || {}).price;
            const totalQuantity = Math.round(perStock / pickPrice) || 1;

            const buyStock = strategy.includes('sudden') ? eclecticBuy : eclecticBuy;
            console.log({ totalQuantity, pickPrice, perStock });

            await log(`buying ${ticker} $${Math.round(perStock)}`, {
                ticker,
                perStock,
                totalQuantity,
                pickPrice
            });
            
            const response = await buyStock({
                ticker,
                pickPrice,
                quantity: totalQuantity
            });
            
            await log(`roundup for buying ${ticker}`, {
                ticker,
                strategy,
                response
            });
            numPurchased++;
        } catch (e) {
            // failed
            failedStocks.push(ticker);
            console.log('failed purchase for ', ticker, e);
        }
    });

    // console.log('finished purchasing', stocksToBuy.length, 'stocks');
    // console.log('attempted amount', totalAmtToSpend);
    // // console.log('amount leftover', amtToSpendLeft);
    // if (failedStocks.length) {
    //     await sendEmail(`failed to purchase`, JSON.stringify(failedStocks));
    // }
};
