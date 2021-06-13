const PmPerfs = require('../models/PmPerfs');
const { mapObject } = require('underscore');
const { avgArray } = require('../utils/array-math');



module.exports = async () => {
  
  const allPms = await PmPerfs.find().sort({ _id: -1 }).lean();
  // strlog({ allPms })
  strlog({ count: allPms.length })

  const byPm = allPms.reduce((acc, pmPerf) => {
    pmPerf.perfs.forEach(perf => {
      acc[perf.pmName] = [
        ...acc[perf.pmName] || [],
        perf.avgTrend
      ];
    });
    return acc;
  }, {});

  strlog({ byPm })

  const analyzed = mapObject(byPm, avgArray);
  return Object.keys(analyzed)
    .sort((a, b) => analyzed[b] - analyzed[a])
    .map(key => ({
      pm: key,
      avg: analyzed[key].twoDec(),
      count: byPm[key].length,
      values: byPm[key].map(n => n.twoDec())
    }));

  // strlog(analyzed);
};