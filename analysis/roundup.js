const Log = require('../models/Log');
const { avgArray } = require('../utils/array-math');
const getTrend = require('../utils/get-trend');
const { mapObject } = require('underscore');

const analyzeRoundup = roundup => {
  const byMethod = {};
  roundup.forEach(response => {
    const { name, ...rest } = response;
    byMethod[name] = [
      ...byMethod[name] || [],
      rest
    ];
  });
  const fillPrices = mapObject(byMethod, responses => 
    avgArray(
      responses.map(response => 
        Number(response.fillPrice)
      ).filter(Boolean)
    )
  );
  const min = Math.min(...Object.values(fillPrices));
  const relToMin = mapObject(fillPrices, p => getTrend(p, min));
  return relToMin;
};

const analyzeByMethod = formatted => {
  const byMethod = {};
  formatted.forEach(({ analyzed }) => {
    Object.keys(analyzed).forEach(method => {
      // if (analyzed[method] !== null) {
        byMethod[method] = [
          ...byMethod[method] || [],
          analyzed[method]
        ];
      // }
    });
  });
  console.log(byMethod)
  return mapObject(byMethod, values => ({
    avg: avgArray(values.filter(Boolean)),
    numNulls: values.filter(isNaN).length
  }));
};

export default async (numDays = 5) => {
  // numDays = numD
  const roundupLogs = await Log.find({
    title: /roundup/i,
    timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000 * numDays) }
  }).sort({ _id: -1 }).lean();
  strlog({numDays})
  const withAnalysis = roundupLogs.map(log => ({
    ...log,
    analyzed: analyzeRoundup(log.data.response.roundUp)
  }));

  const formatted = withAnalysis.map(({ _id, data: { ticker, strategy }, analyzed }) => ({
    _id,
    ticker,
    strategy,
    analyzed
  }));


  const analyzedByMethod = analyzeByMethod(formatted);
  
  strlog({analyzedByMethod})
};