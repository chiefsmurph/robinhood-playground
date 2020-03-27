const Combinatorics = require('js-combinatorics');
const getMultipleHistoricals = require('../../app-actions/get-multiple-historicals');
const getTrend = require('../../utils/get-trend');

const isOvernight = allPrices => {
  const [secondToLast, last] = allPrices
    .slice(-2)
    .map(({ timestamp }) => (new Date(timestamp)).getDate());
  console.log(secondToLast, last)
  return secondToLast !== last;
};

const stSents = [
  'neutral',
  'bullish',
  'bearish'
];
module.exports = {
    period: [5, 10],
    // collections: ['spy', 'options', 'fitty', 'lowVolFitty', 'zeroToOne', 'oneToTwo', 'twoToFive', 'fiveToTen'],
    // excludeCollections: ['holds'],
    handler: async ({ ticker, allPrices }) => {

        // const onlyToday = (() => {
        //   const todayDate = (new Date()).getDate();
        //   return allPrices
        //     .filter(({ timestamp }) => 
        //       (new Date(timestamp)).getDate() === todayDate
        //     );
        // })();

        // if (onlyToday.length < 5) return;


        // const lowVolCount = allPrices.filter(({ volume }) => volume && volume < 1500).length;
        // const lowVolWarning = lowVolCount / allPrices.length > 0.15;




        const allCurrents = allPrices.slice(-34).map(({ currentPrice }) => currentPrice);
        const mostRecent = allCurrents.pop();
        const min = Math.min(...allCurrents);
        const trendFromMin = getTrend(mostRecent, min);
        const bigJump = trendFromMin < -5;

        if (!bigJump) return;

        console.log('found sudden drop', {
          allCurrents,
          trendFromMin
        })

        // check against 5 minute historical data???
        let [fiveMinuteHistoricals] = await getMultipleHistoricals(
            [ticker],
            'interval=5minute&span=day'
        );
        fiveMinuteHistoricals = fiveMinuteHistoricals.map(o => o.close_price);
        const failedHistoricalCheck = fiveMinuteHistoricals.slice(0, -1).some(p => getTrend(p, mostRecent) < 5);
        if (failedHistoricalCheck) {
          return console.log('failed historical check', ticker, mostRecent);
        }

        

        // big jump and passed historical check...
        if (allPrices.length >= 3) {
            console.log('found big jump', ticker, trendFromMin);
            return {
              keys: {
                ...(jumpKey = () => {
                    const key = (() => {
                      if (trendFromMin > -8) return 'minorJump';
                      if (trendFromMin < -13) return 'majorJump';
                      return 'mediumJump';
                    })();
                    return { [key]: true };
                })(),
                // lowVolWarning,
                // [failedHistoricalCheck]: failedHistoricalCheck
                isOvernight: isOvernight(allPrices)
              },
              data: {
                // allCurrents,
                min,
                mostRecent,
                trendFromMin
              }
            };
        }
    },
    pms: {

      notLunch: ['!lunch'],
      notLunchAndNotDown10: ['!lunch', '!down10'],
      notLunchOrNotDown10: [[['!lunch'], ['!down10']]], // wowza

      ...Combinatorics.cartesianProduct(
        [
          '!watchout',
          'watchout',
        ],
        [
          'majorJump',
          'minorJump',
          'mediumJump'
        ],
        [
          'dinner',
          'lunch',
          'brunch',
          'initial',
        ],
        [
          ...[
            10,
            15,
            20,
            30,
            40
          ].map(num => `down${num}`),
          'down',
          '!down'
        ],
        // [
        //   ...[
        //     10,
        //     15,
        //     20,
        //     30,
        //     40
        //   ].map(num => `avgh${num}`),
        //   'avgh',
        //   '!avgh'
        // ],

        [
          ...[120, 90, 60, 30].map(num => `straightDown${num}`),
          'straightDown',
          '!straightDown',
        ],

        stSents,
        // [ 
        //   'spy',
        //   'options',
        //   'droppers',
        //   'hotSt',
        //   'fitty',
        //   'lowVolFitty',
        //   'zeroToOne',
        //   'oneToTwo',
        //   'twoToFive',
        //   'fiveToTen' 
        // ]
      )
      .toArray()
      .reduce((acc, arr) => {

        return {
          ...acc,
          ...Combinatorics.power(arr)
            .toArray()
            .filter(s => s && s.length)
            .filter(array => {
              return array.length < 4 || array.every(val => !stSents.includes(val));
            })
            .reduce((inner, combo) => ({
              ...inner,
              [combo.join('-')]: combo
            }), {})
        }

      }, {})

    },
    isOvernight
};