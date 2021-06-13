const lookupMultiple = require('../utils/lookup-multiple');

class TickerWatcher {
    constructor({ name, handler, timeout = 40000, onPick, disableOnPick }) {
        this.name = name;
        this.handler = handler;
        this.relatedPrices = {};
        this.running = false;
        this.timeout = timeout;
        this.tickersWatching = [];
        this.onPick = onPick;
        this.disableOnPick = disableOnPick;
        this.allPicks = [];
    }
    // tickersRegistered = {}; // { AAPL: ['strategies'] }
    addTickers(tickers) {
        this.tickersWatching = [
            ...new Set(
                [...this.tickersWatching, ...tickers]
            )
        ];
    }
    removeTickers(tickers) {
        console.log('before', this.tickersWatching.length);
        this.tickersWatching = this.tickersWatching.filter(t => !tickers.includes(t));
        console.log('after', this.tickersWatching.length);
    }
    clearTickers() {
        this.tickersWatching = [];
    }
    async start() {
        this.running = true;
        await this.lookupAndWaitPrices();
    }
    stop() {
        this.running = false;
    }
    async lookupAndWaitPrices() {
        if (!this.running) return;
        await this.lookupRelatedPrices();
        setTimeout(() => this.lookupAndWaitPrices(), this.timeout);
    }
    async lookupRelatedPrices() {
        const { tickersWatching, handler, onPick, disableOnPick } = this;
        // console.log(this.picks);
        console.log(this.name, 'getRelatedPrices');
        console.log(this.name, 'getting related prices', tickersWatching.length);
        // console.log(JSON.stringify(tickersToLookup));
        const relatedPrices = await lookupMultiple(
            tickersWatching,
            true
        );

        this.relatedPrices = relatedPrices;
        console.log(this.name, 'done getting related prices');

        const newPicks = await handler(relatedPrices);
        return this.handlePicks(newPicks);
    }
    async handlePicks(newPicks) {
        if (!newPicks || !newPicks.length) return;
        const { disableOnPick, onPick, allPicks } = this;
        if (!disableOnPick) {
            for (let pick of newPicks) {
                await onPick(pick);
            }
        }
        this.allPicks = [
            ...allPicks,
            ...newPicks.filter(Boolean)
        ];
    }
}

module.exports = TickerWatcher;