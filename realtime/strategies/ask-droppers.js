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


module.exports = {
    period: [5, 10],
    disabled: true,
    collections: ['spy', 'options', 'fitty', 'lowVolFitty', 'zeroToOne', 'oneToTwo', 'twoToFive', 'fiveToTen'],
    handler: async ({ ticker, allPrices }) => {

        // const onlyToday = (() => {
        //   const todayDate = (new Date()).getDate();
        //   return allPrices
        //     .filter(({ timestamp }) => 
        //       (new Date(timestamp)).getDate() === todayDate
        //     );
        // })();

        // if (onlyToday.length < 5) return;
        const lowVolCount = allPrices.filter(({ volume }) => volume && volume < 1500).length;
        const lowVolWarning = lowVolCount / allPrices.length > 0.15;

        const allAsks = allPrices.slice(-34).map(({ askPrice }) => askPrice).filter(Boolean);
        const mostRecent = allAsks.pop();
        const min = Math.min(...allAsks);
        const trendFromMin = getTrend(mostRecent, min);
        const bigJump = trendFromMin < -3;

        if (!bigJump) return;

        console.log('found ask drop', {
          allAsks,
          trendFromMin
        })

        // big jump and passed historical check...
        if (allAsks.length >= 3) {
            console.log('found big jump', ticker, trendFromMin);
            return {
              keys: {
                ...(jumpKey = () => {
                    const key = (() => {
                      if (trendFromMin > -5) return 'minorJump';
                      if (trendFromMin < -8) return 'majorJump';
                      return 'mediumJump';
                    })();
                    return { [key]: true };
                })(),
                lowVolWarning,
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


      ...Combinatorics.cartesianProduct(
        [
          'notWatchout',
          'shouldWatchout',
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

      }, {})

    },
    isOvernight
};