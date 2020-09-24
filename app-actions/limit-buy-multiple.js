const simpleBuy = require('./simple-buy');

const alpacaMarketBuy = require('../alpaca/market-buy');
const alpacaLimitBuy = require('../alpaca/limit-buy');
const alpacaSprayBuy = require('../alpaca/spray-buy');
const alpacaAttemptBuy = require('../alpaca/attempt-buy');
const alpacaCancelAllOrders = require('../alpaca/cancel-all-orders');

const getMinutesFromOpen = require('../utils/get-minutes-from-open');

const mapLimit = require('promise-map-limit');
const sendEmail = require('../utils/send-email');
const lookup = require('../utils/lookup');
const Hold = require('../models/Holds');
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
    const numBuys = sliced.length;

    sliced.push(sliced.shift());    // move spray buy to last for max quantity

    
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
        async ({ method, name = method.name, timeoutSeconds, ...rest }, index) => {
            const actualQuantity = Math.round(individualQuantity * ((100 + (index * 20)) / 100));
            console.log(`${name}: purchasing ${actualQuantity} shares of ${ticker}`);
            // await new Promise(resolve => setTimeout(resolve, 1000 * Math.random() * 10))
            const randomizePercent = (v, perc) => {
                const percOffset = (Math.random() * perc * 2) - perc;
                const multiplier = (percOffset + 100) / 100;
                return v * multiplier;
            };
            const response = await method({
                ticker,
                quantity: actualQuantity,
                ...timeoutSeconds && { 
                    timeoutSeconds: Math.round(
                        randomizePercent(timeoutSeconds, 20)
                    ) 
                },
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
        timeoutSeconds: onlyUseCash ? 60 * 30 : 60 * 20,
        fallbackToMarket: true
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
            method: alpacaSprayBuy,
            name: 'sprayBuy',
            numSeconds: 60 * 15,
        },
        {
            method: alpacaAttemptBuy,
            name: 'attemptBuy',
            pickPrice,
            fallbackToMarket: true
        },
        // {
        //     method: alpacaLimitBuy,
        //     name: 'limitu17',
        //     limitPrice: pickPrice * 1.017,
        //     fallbackToMarket: true,
        //     timeoutSeconds: 60 * 10,
        // },
        {
            method: alpacaLimitBuy,
            name: 'limitu1',
            limitPrice: pickPrice * 1.01,
            fallbackToMarket: true,
            timeoutSeconds: 60 * 15,
        },


        {
            method: async (params) => {
                await new Promise(resolve => setTimeout(resolve, 60000 * 3));
                return alpacaAttemptBuy(params);
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
            name: 'limitd3',
            limitPrice: pickPrice * .972,
            timeoutSeconds: 60 * 45,
        },
        {
            method: alpacaLimitBuy,
            name: 'limitd45',
            limitPrice: pickPrice * .965,
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
        buyStyles.splice(0, 4);
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

    if (getMinutesFromOpen() < 270 && totalAmtToSpend) {
        totalAmtToSpend /= 2;
    }

    const { currentPrice, trendSincePrevClose } = await lookup(ticker);
    
    if (trendSincePrevClose > 0) return log('no buying bro because this ticker isnt even in the red');
    else if (trendSincePrevClose > -10) totalAmtToSpend /= 1.5;
    else if (trendSincePrevClose > -15) totalAmtToSpend /= 1.2;
    else if (trendSincePrevClose < -40) totalAmtToSpend *= 1.5;
    else if (trendSincePrevClose < -30) totalAmtToSpend *= 1.2;

    totalAmtToSpend = Math.max(2, totalAmtToSpend);

    if (ticker && !withPrices) {
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

    const { bullishTickers = [], dontBuyPositionsBeingSold } = await getPreferences();

    await mapLimit(stocksToBuy, 3, async ticker => {       // 3 buys at a time

        const position = getRelatedPosition(ticker);
        if (dontBuyPositionsBeingSold) {
            if (position.isSelling) {
                return log(`BLOCKING PURCHASE OF ${ticker} because its currently being sold`);
            }
        }

        const isBankrupt = (JSON.stringify(position) || '').includes('bankrup');
        if (isBankrupt) {
            await log(`FOUND BANKRUPT TICKER.....${ticker}`);
        }

            
        // dont buy stocks if more than 40 percent of current balance!
        let currentValue, percOfBalance = 0;
        try {
            currentValue = (await alpaca.getPosition(ticker)).market_value;
            const balance = await getBalance();
            percOfBalance = currentValue / balance * 100;
        } catch (e) {}
        if (percOfBalance > 40 && !strategy.includes('web-client')) {
            return log(`NOT PURCHASING ${ticker} because ${percOfBalance}% of balance`);
        }

        console.log({ percOfBalance, ticker })

        // for now same amt each stock
        //amtToSpendLeft / (maxNumStocksToPurchase - numPurchased);
        try {

            // prevent day trades!!
            await alpacaCancelAllOrders(ticker, 'sell');

            let pickPrice = (withPrices.find(obj => obj.ticker === ticker) || {}).price;

            if (strategy.includes('overnight')) {
                await log('limit buy mult: we got an overnight drop shooting low')
                pickPrice *= 0.95;
            } else if (strategy.includes('quick')) {
                await log('limit buy mult: we got a quick shooting low')
                pickPrice *= 0.96;
            } else if (strategy.includes('hotSt')) {
                await log('limit buy mult: we got a hotSt shooting low')
                pickPrice *= 0.935;
            } else if (strategy.includes('downer')) {
                pickPrice *= 1.01;  // why not
            } else {
                pickPrice *= 0.99;  // why not
            }


            let totalQuantity = Math.round(perStock / pickPrice) || 1;

            const isBullishTicker = bullishTickers.includes(ticker);
            if (isBullishTicker && strategy !== 'web-client') {
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
                // if (!strategy.includes('sudden-drops')) return 'casual';
            })();
            const response = await eclecticBuy({
                ticker,
                pickPrice,
                quantity: totalQuantity,
                urgency
            });
            
            await log(`roundup for buying ${ticker} via ${strategy}`, {
                ticker,
                strategy,
                response,
                urgency
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
