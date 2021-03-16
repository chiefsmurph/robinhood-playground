const buysInProgress = {};
const timeouts = {};
const { get } = require('underscore');

module.exports = {
    
    registerNewStrategy: (ticker, strategy) => {
        buysInProgress[ticker] = [
            ...buysInProgress[ticker] || [],
            strategy
        ];
        // log(`registering new strategy ${ticker} ${strategy} now it is ${buysInProgress[ticker]}`);
        const timeoutKey = [ticker, strategy].join('-');
        clearTimeout(timeouts[timeoutKey])
        timeouts[timeoutKey] = setTimeout(() => {
            buysInProgress[ticker] = buysInProgress[ticker]
                .filter(s => s !== strategy)
        }, 1000 * 60 * 10); // 10 min
    },

    getActiveStrategy: ticker => {
        const curVal = buysInProgress[ticker];
        // log(`${ticker} currently ${curVal}`)
        if (!curVal || !curVal.length) return;   // nothing ? return undefined
        const relatedPosition = getRelatedPosition(ticker);
        const isRocket = relatedPosition && (get(relatedPosition.stSent || {}, 'wordFlags') ||  [].includes('rocket'));
        if (isRocket) log(`we got a rocket! ${ticker}`);
        return [
            ...curVal,
            ...isRocket ? ['rocket'] : []
        ].uniq().join('-');    // strategy1-strategy-rocket
    }
};