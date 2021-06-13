// of the picks today, what % of them were actually filled?

const Pick = require('../models/Pick');
const jsonMgr = require('../utils/json-mgr');
const loadAllTransactionsSince = require('../rh-actions/load-all-transactions-since');

module.exports = async Robinhood => {

    const mostRecentDate = (await Pick.getUniqueDates()).pop();
    // forPurchase strats
    const mostRecentPMs = await jsonMgr.get(`./json/prediction-models/${mostRecentDate}.json`);
    const forPurchaseStrats = mostRecentPMs.forPurchase;
    const forPurchaseStratsSeperated = forPurchaseStrats.map(strategyName => {
        const minDelim = strategyName.includes('--') ? '--' : '-';
        const lastDash = strategyName.lastIndexOf(minDelim);
        const min = Number(strategyName.substring(lastDash + 1));
        strategyName = strategyName.substring(0, lastDash);
        return {
            strategyName,
            min
        };
    });
    str({ forPurchaseStratsSeperated })
    // Picks
    const dbPicks = await Pick.find({ date: mostRecentDate }).lean();

    // combine
    let combined = flatten(
        forPurchaseStratsSeperated.map(({ strategyName, min }) => {
            // console.log(dbPicks.map(p => p.strategyName), strategyName, 'strat');
            return dbPicks.filter(p => p.strategyName === strategyName && p.min === min);
        })
    );

    str({ combined })

    const onlyTickers = combined.reduce((acc, strat) => {
        return [
            ...acc,
            ...strat ? strat.picks.map(p => p.ticker) : []
        ];
    }, []);


    // all tickers that were recommended to buy today:
    const uniqTickers = [...new Set(onlyTickers)];
    str({ uniqTickers });
    // now look if they were filled...

    const transactions = await loadAllTransactionsSince();
    const filled = transactions.filter(t => t.state === 'filled');
    const tickersWithFilled = uniqTickers.map(ticker => ({
        ticker,
        filled: filled.some(t => t.instrument.symbol === ticker)
    }));

    const notFilled = tickersWithFilled
        .filter(t => !t.filled)
        .map(t => t.ticker);

    const fillPerc = tickersWithFilled.filter(t => t.filled).length / tickersWithFilled.length * 100;

    return {
        fillPerc,
        tickersWithFilled,
        notFilled
    };

};