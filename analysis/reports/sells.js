// pass in strategies
// return list of days

const mapLimit = require('promise-map-limit');
const jsonMgr = require('../../utils/json-mgr');
const generatePlayouts = require('../../app-actions/generate-playouts');

const getAssociatedStrategies = require('../../app-actions/get-associated-strategies');

const getFilesSortedByDate = require('../../utils/get-files-sorted-by-date');
const loadAllTransactionsSince = require('../../rh-actions/load-all-transactions-since');

const roundTo = numDec => num => Math.round(num * Math.pow(10, numDec)) / Math.pow(10, numDec);
const oneDec = roundTo(1);
const twoDec = roundTo(2);

const convertDateToRhFormat = date => {
    const [month, day, year] = date.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const calcWeightAvg = transactions => {
    const totalShares = transactions
        .map(t => t.quantity)
        .reduce((acc, val) => acc + val, 0);
    const numerator = transactions
        .reduce((acc, t) => {
            return acc + (t.avgPrice * t.quantity);
        }, 0)
    return numerator / totalShares;
};

module.exports = async (daysBack = 5) => {

    // console.log({ mostRecentOnly });
    const dailyTransactionDates = await getFilesSortedByDate('daily-transactions');
    console.log({ dailyTransactionDates })
    const robinhoodTransactions = await loadAllTransactionsSince(Number(daysBack) + 3);

    const analyzeDay = async date => {
        
        // first find sells in daily-transactions
        const fullPath = `./json/daily-transactions/${date}.json`;
        const transactions = await jsonMgr.get(fullPath) || [];
        const dailyTransactionSells = transactions.filter(t => t.type === 'sell');
        console.log({ dailyTransactionSells});
        // next find sells in Robinhood orders
        const rhDate = convertDateToRhFormat(date);
        // console.log({ rhDate });
        const formatRhTransaction = order => ({
            ticker: order.instrument.symbol,
            avgPrice: Number(order.average_price),
            quantity: Number(order.quantity),
            side: order.side
        });
        const rhBuys = robinhoodTransactions
            .filter(t => t.side === 'buy' && t.state === 'filled')
            .map(formatRhTransaction);
        // console.log({ rhBuys})
        const rhSellsToday = robinhoodTransactions
            .filter(t => t.updated_at.includes(rhDate))
            .filter(t => t.side === 'sell')
            .map(formatRhTransaction);

        // console.log(JSON.stringify({rhSellsToday, date}, null, 2));
        
        // console.log({fullPath, dailyTransactionDates, rhSellsToday})

        // combine daily-transaction sells + Robinhood orders sell
        // find and merge with associated buys
        const dailyTransactionTickers = dailyTransactionSells.map(t => t.ticker);
        const robinhoodSellsNotIncluded = rhSellsToday
            .filter(sell => !dailyTransactionTickers.includes(sell.ticker));
        console.log({ robinhoodSellsNotIncluded })
        const allSellsToday = [
            ...dailyTransactionSells,
            ...robinhoodSellsNotIncluded
        ];
        if (robinhoodSellsNotIncluded.length) {
            console.log({ robinhoodSellsNotIncluded });
        }
        const associatedBuys = await getAssociatedStrategies({
            tickers: allSellsToday.map(t => t.ticker),
            beforeDate: date
        }, dailyTransactionDates);

        let combined = allSellsToday.map(sell => {
            const matchTicker = obj => obj.ticker === sell.ticker;
            const relatedDTBuy = associatedBuys.find(matchTicker);
            const relatedRHBuys = rhBuys.filter(matchTicker);
            const avgBuyPrice = calcWeightAvg(relatedRHBuys) || (relatedDTBuy || {}).bid_price;
            console.log({ sell, relatedDTBuy })
            return {
                ticker: sell.ticker,
                ...(relatedDTBuy && {
                    strategy: relatedDTBuy.strategy,
                    buyDate: relatedDTBuy.date,
                }),
                buyPrice: avgBuyPrice,
                sellDate: sell.day,
                sellPrice: sell.bid_price || sell.avgPrice,
                quantity: Number(sell.quantity)
            };
        });

        console.log({ associatedBuys, combined});

        const output = await mapLimit(combined, 1, async combination => {
            const playouts = await generatePlayouts(combination.strategy, combination.buyDate);
            const returnPerc = (combination.sellPrice - combination.buyPrice) / combination.sellPrice * 100;
            console.log({ playouts, returnPerc })
            return {
                ...combination,
                playouts: playouts.map(oneDec),
                returnPerc: oneDec(returnPerc),
                returnDollars: twoDec(returnPerc / 100 * combination.sellPrice * combination.quantity)
            };
        });

        // console.log({ output })

        return output;
        
    };

    const formatOutput = (output, date) => {

        let lineOutput = [];
        const l = line => lineOutput.push(line);

        const { totalBuyPrice, returnAbs } = output.reduce(
            (acc, { returnDollars, buyPrice, quantity, ticker }) => {
                if (!returnDollars) {
                    console.log('not found',ticker );
                    return acc;
                }
                return {
                    totalBuyPrice: acc.totalBuyPrice + (buyPrice * quantity),
                    returnAbs: acc.returnAbs + returnDollars
                };
            }, {
                totalBuyPrice: 0,
                returnAbs: 0
            }
        );
        const returnPerc = returnAbs * 100 / totalBuyPrice;

        output
            .filter(c => c.playouts.length)
            .sort((a, b) => Math.abs(b.returnDollars) - Math.abs(a.returnDollars))
            .forEach(({ ticker, returnDollars, returnPerc, playouts, buyPrice, sellPrice, quantity, strategy, buyDate }) => {
                const formattedReturnDollars = returnDollars < 0 ? `-$${Math.abs(returnDollars)}` : `+$${returnDollars}`;
                l(`${ticker}`);
                l(`    buyDate: ${buyDate}`);
                l(`    return: ${formattedReturnDollars} (${returnPerc}%) | strategy: ${strategy}`);
                l(`    buyPrice: $${twoDec(buyPrice)} | sellPrice: $${twoDec(sellPrice)} | quantity: ${quantity}`);
                l(`    playouts: ${playouts.map(t => `${t}%`).join(' ')}`);
            });
        lineOutput = [
            `Total return: $${twoDec(returnAbs)} (${twoDec(returnPerc)}%)`,
            `Total value: $${twoDec(totalBuyPrice)}`,
            '-----------------------------------',
            ...lineOutput
        ];
        console.log({
            returnAbs,
            returnPerc
        });
        return {
            formatted: lineOutput.join('\n'),
            returnAbs,
            returnPerc
        };
    };

    console.log({ daysBack })
    if (daysBack == 1) {
        const todayDate = dailyTransactionDates[0];
        console.log('analyzing', { todayDate });
        const todayAnalyzed = await analyzeDay(todayDate);
        const output = formatOutput(
            todayAnalyzed,
            todayDate
        );
        return {
            ...output,
            todayAnalyzed
        };
    } else {
        const allAnalyzed = await mapLimit(dailyTransactionDates.slice(0, daysBack), 1, analyzeDay);
        const allOutput = allAnalyzed
            .map((analyzed, i) => formatOutput(analyzed, dailyTransactionDates[i]));
        console.log(allOutput.join('\n'));
        return allOutput.join('\n');
        
    }


};
