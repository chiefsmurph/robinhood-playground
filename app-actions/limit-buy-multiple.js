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

const executeBuys = async (buyStyles, totalDollars) => {

    const sliceCount = Math.floor(totalDollars / 4);
    const buyPromises = Object.entries(buyStyles)
        .slice(0, sliceCount)
        .map(
            async ([name, promise]) => {
                strlog({
                    name,
                    promise
                })
                const response = await promise;
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
        sliceCount 
    };
    
};



const eclecticBuy = async ({
    ticker,
    quantity,
    pickPrice
}) => {

    const individualQuantity = Math.round(quantity / 3) || 1;

    const buyStyles = {
        market: alpacaMarketBuy({
            ticker,
            quantity: Math.ceil(individualQuantity / 1.5)
        }),
        limit13: alpacaLimitBuy({
            ticker,
            quantity: individualQuantity,
            limitPrice: pickPrice * 1.013,
            timeoutSeconds: 60 * 5,
            fallbackToMarket: true
        }),
        attempt: alpacaAttemptBuy({
            ticker,
            quantity: individualQuantity,
            pickPrice,
            fallbackToMarket: true
        }),
        // limit3: alpacaLimitBuy({
        //     ticker,
        //     quantity: individualQuantity,
        //     limitPrice: pickPrice * 1.023,
        //     timeoutSeconds: 60 * 1,
        //     fallbackToMarket: true
        // }),
        limit1001: alpacaLimitBuy({
            ticker,
            quantity: Math.round(individualQuantity * 1.2),
            limitPrice: pickPrice * 1.001,
            timeoutSeconds: 60 * 8,
            fallbackToMarket: true
        }),
        limit99: alpacaLimitBuy({
            ticker,
            quantity: Math.round(individualQuantity * 1.4),
            limitPrice: pickPrice * .997,
            timeoutSeconds: 60 * 10,
            fallbackToMarket: false
        }),
        // limit98: alpacaLimitBuy({
        //     ticker,
        //     quantity: Math.round(individualQuantity * 1.6),
        //     limitPrice: pickPrice * .98,
        //     timeoutSeconds: 60 * 10,
        //     fallbackToMarket: false
        // }),
    };

    return {
        ...await executeBuys(buyStyles, pickPrice * quantity),
        individualQuantity
    };
    
};


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
}) => {
    const individualQuantity = Math.round(quantity / 2) || 1;

    const buyStyles = {
        simpleLimitBuy995: alpacaLimitBuy({
            ticker,
            quantity: individualQuantity,
            limitPrice: pickPrice * 0.995,
            timeoutSeconds: 60 * 30,
            fallbackToMarket: false
        }),
        simpleLimitBuy985: alpacaLimitBuy({
            ticker,
            quantity: individualQuantity,
            limitPrice: pickPrice * 0.99,
            timeoutSeconds: 60 * 30,
            fallbackToMarket: false
        }),
    };

    return {
        ...await executeBuys(buyStyles, pickPrice * quantity),
        individualQuantity
    };

};



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
        console.log(perStock, 'purchasng ', ticker);
        try {



            // prevent day trades!!
            await alpacaCancelAllOrders(ticker, 'sell');


            const pickPrice = (withPrices.find(obj => obj.ticker === ticker) || {}).price;
            const totalQuantity = Math.round(perStock / pickPrice) || 1;

            const buyStock = strategy.includes('sudden') ? eclecticBuy : eclecticBuy;
            const response = await buyStock({
                ticker,
                pickPrice,
                quantity: totalQuantity
            });
            
            await sendEmail(`roundup for buying ${ticker}`, JSON.stringify({
                ticker,
                strategy,
                response
            }, null, 2));
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
