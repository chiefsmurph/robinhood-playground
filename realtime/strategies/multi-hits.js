const Combinatorics = require('js-combinatorics');

module.exports = {
  disabled: true,
  postRun: picks => {

    const uniqTickers = picks.map(pick => pick.ticker).uniq();
    const tickersToStratHits = uniqTickers.reduce((acc, ticker) => ({
      ...acc,
      [ticker]: picks
        .filter(pick => pick.ticker === ticker)
        .map(pick => pick.strategyName)
        .uniq()
    }), {});

    const multiHitTickers = Object.keys(tickersToStratHits).filter(ticker => 
      tickersToStratHits[ticker].length > 1
    );
    
    return multiHitTickers.map(ticker => {
      const uniqStrats = tickersToStratHits[ticker];
      return {
        ticker,
        keys: {
          [`${uniqStrats.length}count`]: true,
        },
        data: {
          uniqStrats
        }
      };
    });

  },

  pms: {

    ...Combinatorics.cartesianProduct(
      [
          '2count',
          '3count',
          '4count',
          '5count',
          '6count'
      ],
      [
          'notWatchout',
          'shouldWatchout',
      ],
      [
          'firstAlert'
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

  }
}