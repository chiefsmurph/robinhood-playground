const { SMA } = require('technicalindicators');

const getSMA = values => {
  return SMA.calculate({
      values,
      period: 30
  }) || [];
};

module.exports = {
  period: [5, 10, 30],
  disabled: true,
  collections: [],

  handler: async ({ ticker, allPrices }) => {
      const allCurrents = allPrices.map(obj => obj.currentPrice);
      const [prevPrice, curPrice] = allCurrents.slice(-2);
      const smaSeries = getSMA(allCurrents);
      const [prevSMA, curSMA] = smaSeries.slice(-2);

      const bullishCross = (
        prevPrice < prevSMA &&
        curPrice > curSMA
      );

      const bearishCross = (
        prevPrice > prevSMA &&
        curPrice < curSMA
      );

      return {
          keys: {
            bullishCross,
            bearishCross
          },
          data: {
              smaSeries,
          }
      };
  },

  pms: {
    bullishCross: 'bullishCross',
    bearishCross: 'bearishCross',

    bullishCross30min: ['30min', 'bearishCross']
  }
  
};