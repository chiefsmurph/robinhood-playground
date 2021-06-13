const TickerWatcher = require('./ticker-watcher');
const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');

const getHistoricalData = async (tickers) => {
    let histQS = `interval=5minute`;

    let allHistoricals = await getMultipleHistoricals(
        tickers,
        histQS
    );

    let withHistoricals = tickers.reduce((acc, ticker, i) => ({
        [ticker]: allHistoricals[i],
        ...acc
    }), {});


    // console.log(JSON.stringify(withHistoricals, null, 2));

    return withHistoricals;
}


class HistoricalTickerWatcher extends TickerWatcher {
    constructor({ name, handler, timeout, runAgainstPastData, onPick, onEnd }) {
        super({ name, handler, timeout, onPick });

        this.iteration = 0;
        this.priceCache = {};
        this.timeout = timeout;
        this.onEnd = onEnd;
        this.handler = relatedPrices => {
            // console.log('related from hist', relatedPrices)
            Object.keys(relatedPrices).forEach(ticker => {
                const related = relatedPrices[ticker];
                // console.log(ticker, related)
                this.priceCache[ticker] = [
                    ...this.priceCache[ticker] || [],
                    related
                ];
            });
            return handler(this.priceCache);
        }
        console.log({ runAgainstPastData })
        this.runAgainstPastData = runAgainstPastData;
        this.disableOnPick = runAgainstPastData;
        this.historicals = {};

    }
    clearPriceCache() {
        console.log("clearing price cache");
        this.priceCache = {};
    }
    async addTickers(tickers) {
        console.log('adding ticers', tickers);
        if (this.runAgainstPastData) {
            this.historicals = {
                ...this.historicals,
                ...await getHistoricalData(tickers)
            };
        }
        super.addTickers(tickers);
    }
    async lookupRelatedPrices() {
        if (!this.runAgainstPastData) {
            return super.lookupRelatedPrices();
        }
        const { tickersWatching, handler, iteration, historicals, allPicks } = this;
        if (!historicals) return;
        let outOfData = false;
        const prices = tickersWatching
            .filter(ticker => historicals[ticker])
            .reduce((acc, ticker) => {
                const relatedHist = historicals[ticker][iteration] || {};
                if (!relatedHist.close_price && historicals[ticker][iteration-1] && historicals[ticker][iteration-1].close_price) {
                    outOfData = true;
                }
                return {
                    ...acc,
                    [ticker]: {
                        lastTradePrice: relatedHist.close_price,
                        timestamp: new Date(relatedHist.begins_at)
                    }
                };
            }, {});
        if (outOfData) {
            console.log('out of data, stopping')
            this.stop();
            return this.onEnd(allPicks);
        }
        console.log('increasied iteration')
        this.iteration++;
        const newPicks = await handler(prices);
        // console.log({ newPicks })
        this.handlePicks(newPicks);
    }
}

module.exports = HistoricalTickerWatcher;