const buysInProgress = {};
const timeouts = {};


module.exports = {
    
    registerNewBuy: (ticker, strategy) => {
        buysInProgress[ticker] = [
            ...buysInProgress[ticker],
            strategy
        ];
        const timeoutKey = [ticker, strategy].join('-');
        clearTimeout(timeouts[timeoutKey])
        timeouts[timeoutKey] = setTimeout(() => {
            buysInProgress[ticker] = buysInProgress[ticker]
                .filter(s => s !== strategy)
        }, 1000 * 60 * 10); // 10 min
    },

    getActiveStrategy: ticker =>
        buysInProgress[ticker] 
            ? buysInProgress[ticker].join('-') 
            : undefined,
};