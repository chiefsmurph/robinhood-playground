
const { pick } = require('underscore');

const getRecsFromFiveDayAndSPM = (fiveDay, spmAll) => {

  const combined = spmAll
    .filter(s => ['premarket', 'afterhours'].every(w => !s.strategy.includes(w)))
    // .filter(s => ['smoothkst', 'rsi', 'pennyscan' ,'macd', 'ema'].some(w => s.strategy.includes(w)))
    .map(s => ({
      // ...pick(s, ['strategy']),
      strategyName: s.strategy,
      // s,
      avgMax: s.playouts.onlyMax.avgTrend,
      // fiveDay: fiveDay.find(o => o.name === s.strategy),
      ...pick(
        fiveDay.find(o => o.name === s.strategy),
        ['percUp', 'avgTrend', 'count']
      )
    }))
    .filter(s => s.avgMax && s.avgTrend)
    .filter(s => (
      s.avgMax > 3 
      // && s.avgTrend > 1 
      && s.percUp > 0.5 
      && s.count >= 2 
      && s.count <= 10
    ))
    .filter(s => s.avgMax > s.avgTrend)
    .map(s => ({
      ...s,
      mult: s.avgMax * s.avgTrend
    }))
    .sort((a, b) => b.mult - a.mult);
  
  return combined;
};


module.exports = getRecsFromFiveDayAndSPM;