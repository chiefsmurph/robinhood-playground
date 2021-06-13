const getFilesSortedByDate = require('../utils/get-files-sorted-by-date');
const jsonMgr = require('../utils/json-mgr');


const getAssociatedStrategies = async ({ 
    tickers,
    beforeDate
}, dailyTransactionDates) => {

    dailyTransactionDates = dailyTransactionDates || await getFilesSortedByDate('daily-transactions');
    const beforeDateIndex = dailyTransactionDates.findIndex(date => date === beforeDate);
    if (beforeDateIndex) {
        dailyTransactionDates = dailyTransactionDates.slice(beforeDateIndex + 1);
    }
    
    const withStrategies = [];  // [{ ticker, strategy }]
    const withStrategiesIncludesTicker = ticker =>
        withStrategies
            .map(obj => obj.ticker)
            .includes(ticker);

    for (let file of dailyTransactionDates) {
        // console.log('checking', file, withStrategies);
        const transactions = await jsonMgr.get(`./json/daily-transactions/${file}.json`);
        tickers
            .filter(ticker => !withStrategiesIncludesTicker(ticker))
            .forEach(ticker => {
                const foundStrategies = transactions.filter(transaction =>
                    transaction.ticker === ticker
                    && transaction.type === 'buy'
                );
                for (let foundStrategy of foundStrategies) {
                    const { strategy, min, bid_price } = foundStrategy;
                    withStrategies.push({
                        ticker,
                        strategy: `${strategy}-${min}`,
                        date: file,
                        bid_price
                    });
                }
            });

        if (tickers.every(withStrategiesIncludesTicker)) {
            // console.log('found all tickers');
            break;
        }
    }

    return withStrategies;
};

module.exports = getAssociatedStrategies;