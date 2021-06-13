const Combinatorics = require('js-combinatorics');
const { RSI } = require('technicalindicators');

const getRSI = values => {
    return RSI.calculate({
        values,
        period: 14
    }) || [];
};

module.exports = {
    period: [10, 30, 'd'],
    collections: ['fitty', 'twoToFive', 'hotSt', 'spy', 'holds'],
    handler: async ({ ticker, allPrices, collections }) => {
        const allCurrents = allPrices.map(obj => obj.currentPrice);
        const mostRecent = allCurrents[allCurrents.length - 1];
        const rsiSeries = getRSI(allCurrents);
        const rsi = rsiSeries[rsiSeries.length - 1];
        console.log({ rsi })
        return {
            keys: {
                ...(lessThanKey = () => {
                    const num = [
                        5, 10, 15, 20, 25,
                        ...ticker === 'SPY' ? [30, 35, 40] : []
                    ].find(val => rsi < val);
                    const key = num ? `rsilt${num}` : null;
                    if (key) {
                        return { [key]: true };
                    }
                })(),
                ...collections.includes('holds') && (greaterThanKey = () => {
                    const num = [
                        60, 70, 80, 90
                    ].find(val => rsi > val);
                    const key = num ? `rsigt${num}` : null;
                    if (key) {
                        return { [key]: true };
                    }
                })(),
            },
            data: {
                // allCurrents,
                mostRecent,
                rsiSeries,
                rsi,
            }
        };
    },
    
    pms: {
        

        ...Combinatorics.cartesianProduct(
            [
                '10min',
                '30min',
                'daily'
            ],
            [
                'notWatchout',
                'shouldWatchout',
            ],
            [
                'firstAlert'
            ],
            [
                'rsilt5',
                'rsilt10',
                'rsilt15'
            ],
            [
                'dinner',
                'lunch',
                'brunch',
                'initial'
            ]
          ).toArray().reduce((acc, arr) => {
    
            return {
              ...acc,
              ...Combinatorics.power(arr)
                .toArray()
                .filter(s => s && s.length)
                .reduce((inner, combo) => ({
                  ...inner,
                  [combo.join('-')]: combo
                }), {})
            }
    
          }, {}),

          

        // // rsilt20: strat => [
        // //     'rsilt20',
        // //     'rsilt15',
        // //     'rsilt10',
        // // ].some(text => strat.includes(text)),

        // shouldWatchout: 'shouldWatchout',
        // '10minWatchout': ['shouldWatchout', '10min'],
        // notWatchout: 'notWatchout',

        // firstAlerts: 'firstAlert',

        // 'daily': 'daily',
        // '30minute': '30min',
        // '10minute': '10min',
        // '5minute': '5min',

        // 'options': ['options'],
        // '30minoptions': ['30min', 'options'],
        // '10minoptions': ['10min', 'options'],

        // lessthan5: 'rsilt5',
        // lessthan5fitty: ['rsilt5', 'fitty'],
        // lessthan5fitty10min: ['rsilt5', 'fitty', '10min'],
        // lessthan10fitty: ['rsilt10', 'fitty'],


        // lessthan10: 'rsilt10',
        // lessthan15: 'rsilt15',


        // rhtopunder300: ['under300', 'rhtop'],

        // top10030min: ['30min', 'top100'],
        // top100under20: ['30min', 'top100', 'under20'],





        '10minlt5': ['10min', 'lt5'],
        '5minlt15': ['5min', 'lt15'],


        ...[
            'lt5,notWatchout,10min',
            'lt10,notWatchout,10min',
            'lt15,notWatchout,10min',
        ].reduce((acc, str) => {
            const split = str.split(',');
            const key = split.join('-');
            return {
                ...acc,
                [key]: split
            };
        }, {})

    },

    postRun: (newPicks, todaysPicks, periods) => {

        // 5 period picks with also 10 min and 30min in the last 2 pick segments
        const fivePeriodPicks = newPicks.filter(pick => pick.period === 5 && pick.strategyName === 'rsi');
        const tickers = fivePeriodPicks.map(pick => pick.ticker).uniq();
        const bothCurrentAndPrevPicks = [
            ...newPicks,
            ...todaysPicks.slice(-1),
        ];
        const with10and30Rsi = tickers.filter(ticker => {
            return [10, 30].every(period => {
                return bothCurrentAndPrevPicks.find(pick => 
                    pick.ticker === ticker &&
                    pick.period === period &&
                    pick.strategyName === 'rsi'
                );
            });
        });
        const five10and30picks = with10and30Rsi.map(ticker => ({
            ticker,
            keys: {
                '510and30': true
            }
        }));



        return [
            ...five10and30picks
        ];
    }
};