const { EMA } = require('technicalindicators');

const getEMA = (values, period) => {
  return EMA.calculate({
      values,
      period
  }) || [];
};

module.exports = {
  period: [10, 30],
  collections: ['options', 'spy'],

  handler: async ({ ticker, allPrices }) => {
      const allCurrents = allPrices.map(obj => obj.currentPrice);
      const [tenPrev, tenCur] = getEMA(allCurrents, 5).slice(-2);
      const [hundredPrev, hundredCur] = getEMA(allCurrents, 100).slice(-2);
      
      const bullishCross = (
        tenPrev < hundredPrev &&
        tenCur > hundredCur
      );

      const bearishCross = (
        tenPrev > hundredPrev &&
        tenCur < hundredCur
      );

      if (bearishCross) {
        console.log({
          tenPrev,
          tenCur,
          hundredPrev,
          hundredCur
        })
      }

      return {
          keys: {
            bullishCross,
            bearishCross
          },
          data: {
              // smaSeries,
          }
      };
  },

  pms: {
    bullishCross: 'bullishCross',
    bearishCross: 'bearishCross',
    bullishCross10min: ['10min', 'bearishCross']
  }
  
};