const stratPerfOverall = require('../strategy-perf-overall');
const spmRecent = require('../spm-recent');
const getRecsFromFiveDayAndSPM = require('./get-recs-from-fiveday-and-spm');
const addTodayTrendToStrategies = require('./add-today-trend-to-strategies');
const { avgArray } = require('../../utils/array-math');

module.exports = async (addTodayTrend) => {
  let fiveDay = (await stratPerfOverall(false, 5, 0, 1)).sortedByAvgTrend;
  fiveDay = fiveDay.filter(s => s.count >= 2 && s.count <= 8);
  const spmAll = (await spmRecent()).all
    .filter(s => s.count >= 3 && s.count <= 12);

  const recs = getRecsFromFiveDayAndSPM(fiveDay, spmAll);





  if (!addTodayTrend) return recs;
  strlog({
    recs
  })


  const withTodayTrend = await addTodayTrendToStrategies(recs);
  const ofInterest = withTodayTrend.filter(s => s.todayTrend);;
  
  
  strlog({
    withTodayTrend: ofInterest
  });


  const analyze = what => [5, 10, 15, 20, 25, 30].reduce((acc, count) => ({
    ...acc,
    [count]: avgArray(what.slice(0, count).map(s => s.todayTrend).filter(Boolean))
  }), {});

  // strlog({
  //   overall: withTodayTrend.slice(0, 10)
  // });


  

  const goodOnAllFronts = ofInterest.filter(s => s.todayTrend > 0.4);

  strlog({ goodOnAllFronts });

  strlog({ goodOnAllFronts: goodOnAllFronts.map(s => s.strategyName )})

  strlog({ 
    ofInterest: analyze(ofInterest),
    overall: analyze(withTodayTrend)
  });



};