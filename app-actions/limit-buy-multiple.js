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
    const sliceCount = Math.min(Math.floor(totalDollars / 5) || 1, buyStyles.length);
    const individualQuantity = Math.floor(quantity / sliceCount) || 1;
    console.log({
        totalDollars,
        sliceCount,
        individualQuantity,
        quantity
    })

    const sliced = buyStyles.slice(0, sliceCount);

    const buyStylesLog = sliced.map(({ method, name = method.name, limitPrice }) => 
        [
            name,
            limitPrice
        ]
            .filter(Boolean)
            .join(', ')
    ).join(', ');
    await log(`limit buy multiple ${ticker} - ${buyStylesLog}`)
    const buyPromises = sliced.map(
        async ({ method, name = method.name, ...rest }, index) => {
            const actualQuantity = Math.round(individualQuantity * ((100 + index) / 100));
            console.log(`${name}: purchasing ${actualQuantity} shares of ${ticker}`);
            // await new Promise(resolve => setTimeout(resolve, 1000 * Math.random() * 10))
            const response = await method({
                ticker,
                quantity: actualQuantity,
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
    pickPrice,
    urgency
}) => {

    const { onlyUseCash } = await getPreferences();

    const defaults = {
        timeoutSeconds: onlyUseCash ? 60 * 30 : Number.POSITIVE_INFINITY,
        fallbackToMarket: false
    };
    let buyStyles = [
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
            method: alpacaAttemptBuy,
            name: 'attemptBuy',
            pickPrice,
            fallbackToMarket: true
        },
        {
            method: alpacaLimitBuy,
            name: 'limitu17',
            limitPrice: pickPrice * 1.017,
            fallbackToMarket: true,
            timeoutSeconds: 60 * 10,
        },
        {
            method: alpacaLimitBuy,
            name: 'limitu1',
            limitPrice: pickPrice * 1.01,
            fallbackToMarket: true,
            timeoutSeconds: 60 * 15,
        },


        {
            method: async (...args) => {
                await new Promise(resolve => setTimeout(resolve, 60000 * 3));
                return alpacaAttemptBuy(...args);
            },
            name: 'attemptBuy3MinDelay',
            pickPrice,
            fallbackToMarket: true
        },

        {
            method: alpacaLimitBuy,
            name: 'limit100',
            limitPrice: pickPrice * 1.003,
        },
        
        {
            method: alpacaLimitBuy,
            name: 'limitdp5',
            limitPrice: pickPrice * .996,
        },



        {
            method: alpacaLimitBuy,
            name: 'limitd1',
            limitPrice: pickPrice * .989,
        },
        {
            method: alpacaLimitBuy,
            name: 'limitd2',
            limitPrice: pickPrice * .982,
            timeoutSeconds: 60 * 45,
        },
        {
            method: alpacaLimitBuy,
            name: 'limitd3',
            limitPrice: pickPrice * .975,
            timeoutSeconds: 60 * 60,
        },

        // {
        //     method: alpacaLimitBuy,
        //     name: 'limitd4',
        //     limitPrice: pickPrice * .965,
        //     timeoutSeconds: 60 * 60,
        // },
        // {
        //     method: alpacaLimitBuy,
        //     name: 'limitd5',
        //     limitPrice: pickPrice * .955,
        //     timeoutSeconds: 60 * 60,
        // },
    ].map(style => ({
        ...defaults,
        ...style
    }));
    if (urgency === 'casual') {
        // remove limitu1
        buyStyles.splice(0, 5);
    } else if (urgency === 'aggressive') {
        // increase prices by 1 percent
        buyStyles = buyStyles.map(( limitPrice, ...buy ) => ({
            ...buy,
            ...limitPrice && { limitPrice: limitPrice * 1.01 },
        }));
    }
    return executeBuys({
        ticker,
        quantity,
        pickPrice,
        buyStyles
    });
}
    

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
    ticker
} = {}) => {


    if (ticker && !withPrices) {
        const { currentPrice } = await lookup(ticker);
        await log(`we got a limit buy multiple with no price.... ${ticker} @ ${currentPrice}`, { ticker, currentPrice });
        withPrices = [{
            ticker,
            price: currentPrice
        }];
    }

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

    const { bullishTickers = [] } = await getPreferences();

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
            let totalQuantity = Math.round(perStock / pickPrice) || 1;

            const isBullishTicker = bullishTickers.includes(ticker);
            if (isBullishTicker) {
                await log('OH NELLY WE GOT A BULLISH TICKER LIMIT BUY - double quantity time');
                totalQuantity *= 2;
            }


            // const buyStock = strategy.includes('sudden') ? eclecticBuy : eclecticBuy;
            console.log({ totalQuantity, pickPrice, perStock });

            await log(`buying ${ticker} $${Math.round(perStock)}`, {
                ticker,
                perStock,
                totalQuantity,
                pickPrice
            });
            
            const urgency = (() => {
                if (strategy.includes('red-and-bullish')) return 'agressive';
                if (!strategy.includes('sudden-drops')) return 'casual';
            })();
            const response = await eclecticBuy({
                ticker,
                pickPrice,
                quantity: totalQuantity,
                urgency
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
