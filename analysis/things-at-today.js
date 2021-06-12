const Pick = require('../models/Pick');
const lookupMultiple = require('../utils/lookup-multiple');
const getTrend = require('../utils/get-trend');
const { avgArray } = require('../utils/array-math');

export default async (date, strat) => {
    console.log({ strat, date })
    const allFound = await Pick.find({
        date,
        ...strat ? { strategyName: strat } : {}
    }).lean();

    const ofInterest = allFound.filter(pick => pick.strategyName.includes('notWatchout'));

    const tickerPrices = ofInterest.reduce((acc, pick) => [
        ...acc,
        ...pick.picks.map(p => ({
            ...p,
            strategy: pick.strategyName
        }))
    ], []);

    
    const tickersToLookup = [
        ...new Set(
            tickerPrices.map(o => o.ticker)
        )
    ];

    const tPrices = await lookupMultiple(tickersToLookup);

    const withNowPrices = tickerPrices
        .map(pick => ({
            ...pick,
            nowPrice: tPrices[pick.ticker]
        }))
        .map(pick => ({
            ...pick,
            trend: getTrend(pick.nowPrice, pick.price)
        }));

    const analyzed = withNowPrices.sort((a, b) => b.trend - a.trend);

    const formatted = analyzed.map(({ ticker, trend, strategy }) => [
        trend,
        ticker,
        strategy
    ].join(' '));

    formatted.forEach(str);

    console.log(
        'avg trend',
        avgArray(
            analyzed.map(p => p.trend)
        )
    );

    // str(analyzed)

    console.log(
        'avg trend only goods',
        avgArray(
            analyzed
                .filter(
                    p => [
                        'failedHistorical', 
                        // 'minorJump'
                    ].every(term => !p.strategy.includes(term))
                    && [
                        'under1-',
                        'under5-'
                    ].some(price => p.strategy.includes(price))
                )
                .map(p => p.trend)
        )
    )

    console.log(
        'avg trend only majorJumps',
        avgArray(
            analyzed
                .filter(
                    p => p.strategy.includes('majorJump')
                )
                .map(p => p.trend)
        )
    )

    // console.log(formatted)
};