const Combinatorics = require('js-combinatorics');
const getMultipleHistoricals = require('../../app-actions/get-multiple-historicals');
const getTrend = require('../../utils/get-trend');
const getSpyTrend = require('../../utils/get-spy-trend');

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
    period: [5],
    // collections: ['spy', 'options', 'fitty', 'lowVolFitty', 'zeroToOne', 'oneToTwo', 'twoToFive', 'fiveToTen'],
    excludeCollections: ['hotSt'],
    disabled: true,
    handler: async ({ ticker, allPrices }) => {

      const spyTrend = await getSpyTrend();
      const limitOffset = spyTrend > 0 ? Math.abs(Math.round(spyTrend)) : 0;


      const allCurrents = allPrices.slice(-27).map(({ currentPrice }) => currentPrice);
      const mostRecent = allCurrents.pop();
      const max = Math.max(...allCurrents);
      const trendFromMax = getTrend(mostRecent, max);
      const bigSpike = trendFromMax > 5;

      if (!bigSpike) return;

      console.log('found quick spike', {
        allCurrents,
        trendFromMax
      })

      // check against 5 minute historical data???
      let [fiveMinuteHistoricals] = await getMultipleHistoricals(
          [ticker],
          'interval=5minute&span=day'
      );
      fiveMinuteHistoricals = fiveMinuteHistoricals.map(o => o.close_price);
      const failedHistoricalCheck = fiveMinuteHistoricals.slice(0, -1).some(p => getTrend(p, mostRecent) > 5);
      // if (failedHistoricalCheck) {
      //   return log('failed historical check', { ticker, mostRecent });
      // }

      

      // big spike and passed historical check...
      if (allPrices.length >= 3) {
          console.log('found big spike', ticker, trendFromMax);
          return {
            keys: {
              ...(spikeKey = () => {
                  const key = (() => {
                    if (trendFromMax > 8 + limitOffset) return 'minorSpike';
                    if (trendFromMax < 13 + limitOffset) return 'majorSpike';
                    return 'mediumSpike';
                  })();
                  return { [key]: true };
              })(),
              // lowVolWarning,
              failedHistoricalCheck,
              isOvernight: isOvernight(allPrices)
            },
            data: {
              // allCurrents,
              max,
              mostRecent,
              trendFromMax
            }
          };
      }
    },
    pms: {

      // notLunch: ['!lunch'],
      // notLunchAndNotDown10: ['!lunch', '!down10'],
      // notLunchOrNotDown10: [[['!lunch'], ['!down10']]], // wowza

      ...Combinatorics.cartesianProduct(
        [
          '!watchout',
          'watchout',
        ],
        [
          'majorSpike',
          'minorSpike',
          'mediumSpike'
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