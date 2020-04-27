const StratPerf = require('../models/StratPerf');
const Pick = require('../models/Pick');
const { avgArray } = require('../utils/array-math');
const { pick } = require('underscore');

module.exports = async (numDays = 10, ...words) => {
  const daysOfInterest = (await Pick.getUniqueDates()).slice(0 - numDays);
  strlog({ daysOfInterest })
  const matches = await StratPerf
    .find({
      $and: words.map(word => ({
        stratMin: { $regex: word }
      })),
      date: {
        $in: daysOfInterest
      }
    })
    .sort({ _id: -1 })
    .lean();
  strlog({ matches });

  const count = matches.length;
  const agg = matches.map(stratPerf => ({
    ...stratPerf,
    avgNextDayPerf: avgArray(stratPerf.perfs.filter(perf => perf.period.includes('same')).map(perf => perf.avgTrend)),
  }));

  strlog({
    count,
    perfs: agg.map(perf => pick(perf, ['date', 'stratMin', 'avgNextDayPerf'])),
    agg: avgArray(agg.map(perf => perf.avgNextDayPerf).filter(Boolean))
  })
};