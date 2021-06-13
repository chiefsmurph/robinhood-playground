// utils
const getTrend = require('../utils/get-trend');

// app-actions
const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');
const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');

// npm
const mapLimit = require('promise-map-limit');
const { OBV, SMA, isTrendingUp } = require('technicalindicators');



const analyzeTrend = (withHistoricals) => {
    let withTechnicalIndicators = withHistoricals.map((buy, i) => {
        
        const { historicals } = buy;
        // console.log(historicals, 'historicals')

        const OBVobject = ['close:close_price', 'volume'].reduce((acc, val) => {
            let [objKey, historicalKey] = val.split(':');
            if (!historicalKey) historicalKey = objKey;
            // console.log(historicalKey, objKey)
            return {
                [objKey]: historicals.map(hist => hist[historicalKey]),
                ...acc
            };
        }, {});

        const SMAobject = {
            period: 8,
            values: historicals.map(hist => hist.close_price)
        };


        // console.log(OBVobject);
        return {
            OBV: OBV.calculate(OBVobject),
            SMA: SMA.calculate(SMAobject),
            // isTrendingUp: await isTrendingUp({ values: historicals.map(hist => hist.close_price) }),
            ...buy,
        };
    });

    // const onlyBasics = withTechnicalIndicators.map(buy => {
    //     [
    //         'historicals',
    //         'quote_data',
    //     ].forEach(key => {
    //         delete buy[key];
    //     });
    //     return buy;
    // });

    const withBooleans = withTechnicalIndicators.map(buy => {
        const { SMA, historicals } = buy;
        const mostRecentSMA = SMA[SMA.length - 1];
        return {
            ...buy,
            priceToSMA: getTrend(mostRecentSMA, buy.last_trade_price),
            SMAoverUnder: SMA.map((avg, index) => {
                const relHist = historicals[index];
                // return relHist.close_price > avg;
                return getTrend(avg, relHist.close_price);
            })
        }
    });

    const withSMAcrossovers = withBooleans.map(buy => {
        return {
            ...buy,
            SMAcrossovers: (() => {
                let underCount = 0;
                const pricesAtCrossover = [];
                buy.SMAoverUnder.forEach((trend, index) => {
                    const isOver = trend > 0;
                    if (!isOver) {
                        underCount++;
                    } else {
                        if (underCount > 5) {
                            pricesAtCrossover.push({
                                trend: getTrend(
                                    buy.historicals[index + 1].open_price,
                                    buy.historicals[index + 2].close_price,
                                ),
                                index
                            });
                        }
                        underCount = 0;
                    }
                });
                return pricesAtCrossover;
            })()
        };
    });

    const getTopSMAoverUnder = (arr, index) => {
        const sortedBySMAoverUnder = arr.sort((a, b) => {
            return b.SMAoverUnder[index] - a.SMAoverUnder[index];
        });
        // console.log(sortedBySMAoverUnder, 'sorted');
        const topSMAoverUnder = sortedBySMAoverUnder[0];
        return topSMAoverUnder;
    };


    const singleBestSMAs = withSMAcrossovers[0].historicals.map((_, index) => {
        const topSMAoverUnder = getTopSMAoverUnder(withSMAcrossovers, index);
        if (!topSMAoverUnder) {
            return null;
        }
        return {
            ticker: topSMAoverUnder.ticker,
            winningSMA: topSMAoverUnder.SMAoverUnder[index],
            price: topSMAoverUnder.historicals[index].close_price,
            ...(topSMAoverUnder.historicals[index+1] && {
                trend: getTrend(
                    topSMAoverUnder.historicals[index+1].close_price,
                    topSMAoverUnder.historicals[index].close_price
                )
            }),
            trendToEOD: getTrend(
                topSMAoverUnder.historicals[topSMAoverUnder.historicals.length - 1].close_price,
                topSMAoverUnder.historicals[index].close_price
            )
        };
    });

    const topSMAoverUnderLastTrade = withBooleans.sort((a, b) => {
        return b.priceToSMA - a.priceToSMA;
    })[0];

    const topOBV = withBooleans.sort((a, b) => {
        return b.OBV[b.OBV.length - 1] - a.OBV[a.OBV.length - 1];
    })[0];

    // console.log(JSON.stringify(withSMAcrossovers, null, 2));


    const withCrossoverRecently = (() => {
        const numHistoricals = withSMAcrossovers[0].historicals.length;
        const foundCrossoverRecently = withSMAcrossovers.filter(buy => {
            const foundCrossover = buy.SMAcrossovers.find(crossover => {
                return crossover.index >= numHistoricals - 5
            });
            return !!foundCrossover;
        });
        return foundCrossoverRecently ? foundCrossoverRecently.map(buy => buy.ticker) : null;
    })();

    // console.log(JSON.stringify(singleBestSMAs, null, 2));
    // const

    return {
        topSMAoverUnderHist: [singleBestSMAs[singleBestSMAs.length - 1].ticker],
        topSMAoverUnderLastTrade: [topSMAoverUnderLastTrade.ticker],
        withCrossoverMostRecentHist: withCrossoverRecently,
        topOBV: [topOBV.ticker]
    };
};




const trendFilter = async (trend) => {

    // add overnight jump
    console.log('adding overnight jump')
    const withOvernightJump = await addOvernightJumpAndTSO(trend);
    console.log('done adding overnight jump')


    const top50Volume = withOvernightJump.sort((a, b) => {
        return b.fundamentals.volume - a.fundamentals.volume;
    }).slice(0, 50);


    const getTrendWithHistoricals = async (interval, span) => {
        // add historical data
        let allHistoricals = await getMultipleHistoricals(
            top50Volume.map(buy => buy.ticker),
            `interval=${interval}&span=${span}`
        );

        let withHistoricals = top50Volume.map((buy, i) => ({
            ...buy,
            historicals: allHistoricals[i]
        }));

        return withHistoricals;
    };


    // console.log(JSON.stringify(withHistoricals, null, 2));


    const perms = [
        {
            interval: '5minute',
            span: 'day'
        },
        {
            interval: '10minute',
            span: 'day'
        },
        {
            interval: '10minute',
            span: 'week'
        },
        {
            interval: 'day',
            span: 'year'
        },
    ];

    const permMapped = await mapLimit(perms, 2, async perm => {
        const { interval, span } = perm;
        const trend = await getTrendWithHistoricals(interval, span);
        return {
            perm,
            analyzed: analyzeTrend(trend)
        };
    });

    return permMapped.reduce((acc, obj) => {
        const { analyzed, perm: { interval, span } } = obj;
        const prefixedObj = Object.keys(analyzed).reduce((innerAcc, key) => ({
            ...innerAcc,
            [`${interval}-${span}-${key}`]: analyzed[key]
        }), {});
        return {
            ...acc,
            ...prefixedObj
        };
    }, {});
};

const technicalIndicators = {
    name: 'technical-indicators',
    trendFilter,
    // run: [14, 29, 87, 114, 159, 190, 220, 246, 320, 340, 357, 383],
};

module.exports = technicalIndicators;
