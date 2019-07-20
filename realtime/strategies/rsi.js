const { RSI } = require('technicalindicators');

const getRSI = values => {
    return RSI.calculate({
        values,
        period: 14
    }) || [];
};

module.exports = {
    period: [5, 10, 30],
    // collections: 'all',
    handler: async ({ ticker, allPrices }) => {
        const allCurrents = allPrices.map(obj => obj.currentPrice);
        const mostRecent = allCurrents[allCurrents.length - 1];
        const rsiSeries = getRSI(allCurrents);
        const rsi = rsiSeries[rsiSeries.length - 1];
        // if (rsi < 20) {
            return {
                keys: {
                    ...(rsiKey = () => {
                        const num = [5, 10, 15, 20, 25, 30].find(val => rsi < val);
                        const key = num ? `rsilt${num}` : 'fluke';
                        return { [key]: true };
                    })()
                },
                data: {
                    // allCurrents,
                    mostRecent,
                    rsiSeries,
                    rsi,
                }
            };
        // }
    },
    
    pms: {
        
        // rsilt20: strat => [
        //     'rsilt20',
        //     'rsilt15',
        //     'rsilt10',
        // ].some(text => strat.includes(text)),

        shouldWatchout: 'shouldWatchout',
        notWatchout: 'notWatchout',

        firstAlerts: 'firstAlert',

        '30minute': '30min',
        '10minute': '10min',
        '5minute': '5min',


        '30minoptions': ['30min', 'options'],
        '10minoptions': ['10min', 'options'],

        lessthan5: 'rsilt5',
        lessthan10: 'rsilt10',
        lessthan15: 'rsilt15',


        rhtopunder300: ['under300', 'rhtop'],

        top10030min: ['30min', 'top100'],
        top100under20: ['30min', 'top100', 'under20'],
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