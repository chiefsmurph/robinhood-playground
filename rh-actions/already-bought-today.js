const loadAllTransactionsSince = require('./load-all-transactions-since');
const jsonMgr = require('../utils/json-mgr');

const inDt = async (ticker) => {
    const fileName = `./json/daily-transactions/${(new Date()).toLocaleDateString().split('/').join('-')}.json`;
    const curTransactions = await jsonMgr.get(fileName) || [];
    const foundInDT = curTransactions.some(transaction => {
        return transaction.ticker === ticker && transaction.type === 'buy';
    });
    return foundInDT;
};

module.exports = async (ticker) => {

    const inTransactions = async () => {
        const transactions = await loadAllTransactionsSince(1);
        console.log(JSON.stringify(transactions, null, 2));
        return transactions.some(t => {
            return t.side === 'buy' && t.instrument.symbol === ticker;
        });
    };
    
    return await inDt(ticker) || await inTransactions();
    
};