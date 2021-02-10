const buysInProgress = {};
const timeouts = {};


module.exports = {
    
    registerNewBuy: (ticker, strategy) => {
        buysInProgress[ticker] = [
            ...buysInProgress[ticker] || [],
            strategy
        ];
        const timeoutKey = [ticker, strategy].join('-');
        clearTimeout(timeouts[timeoutKey])
        timeouts[timeoutKey] = setTimeout(() => {
            buysInProgress[ticker] = buysInProgress[ticker]
                .filter(s => s !== strategy)
        }, 1000 * 60 * 10); // 10 min
    },

    getActiveStrategy: ticker => {
        const curVal = buysInProgress[ticker];
        if (!curVal || curVal.length) return;   // nothing ? return undefined
        const relatedPosition = getRelatedPosition(ticker);
        const rocketString = relatedPosition.stSent.wordFlags.includes('rocket') && 'rocket';
        return [
            ...curVal,
            ...rocketStr ? [rocketString] : []
        ].join('-');    // strategy1-strategy-rocket
    }
};