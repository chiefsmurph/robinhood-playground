const StratPerf = require('../../models/StratPerf');
const { mapObject, chain, sortBy, uniq } = require('underscore');
const { avgArray, percUp } = require('../../utils/array-math');
const addTodayTrendToStrategies = require('./add-today-trend-to-strategies');
const realtimeRunner = require('../../realtime/RealtimeRunner');

module.exports = async (daysBack = 8, skipDays = 1, addTodayTrend = true) => {

  console.log("THE BIG LEBOWSKI");
  console.log("STRATEGY AND PM ANALYZER COPYRIGHT JOHN MURPHY 2019");
  console.log("LOLOLOLOLOL HAGS (have a great summer)");

  const allDates = await StratPerf.getUniqueDates();
  const datesOfInterest = allDates.slice(0, allDates.length - skipDays).slice(0 - daysBack);
  strlog({ allDates, datesOfInterest });
  
  const response = {};


  let byStrategy = {};


  for (let date of datesOfInterest) {
    console.log('lebowski', { date });
    const allStratPerfs = await StratPerf.find({ date }).lean();

    allStratPerfs.forEach(stratPerf => {
      const {
        stratMin,
        perfs,
      } = stratPerf;
      const filteredPerfs = perfs.filter(({ period, avgTrend }) => {
        const validPeriod = [
          'same-day',
          'next-day-9'
        ].some(v => period.includes(v));
        const validTrend = Math.abs(avgTrend) < 60;
        return validPeriod && validTrend;
      });
      const newAvg = avgArray(
        filteredPerfs.map(s => s.avgTrend)
      );

      byStrategy[stratMin] = byStrategy[stratMin] || {};
      byStrategy[stratMin][date] = [
        ...byStrategy[stratMin][date] || [],
        newAvg
      ];

    });
    
  }

  byStrategy = mapObject(
    byStrategy,
    dateObj => mapObject(
      dateObj,
      trends => avgArray(trends)
    )
  );


  // strlog({
  //   byStrategy
  // });

  let asArray = Object.entries(byStrategy).map(([strategyName, dateObj]) => {
    const trends = Object.values(dateObj).filter(Boolean);
    return {
      strategyName,
      dateObj,
      trendCount: trends.length,
      overallAvg: avgArray(trends),
      percUp: percUp(trends)
    };
  });
  // strlog({asArray})

  asArray = asArray
    .filter(s => ['premarket', 'afterhours'].every(w => !s.strategyName.includes(w)))
    // .filter(s => 
    //   s.strategyName.includes('rsi') && 
    //   s.strategyName.includes('10min') &&
    //   s.strategyName.includes('lt15')
    // )

  asArray = chain(asArray).sortBy('overallAvg').sortBy('percUp').value();
  // strlog({ asArray })
  if (!addTodayTrend) return asArray;

  await realtimeRunner.init(true);
  const pms = realtimeRunner.getPms();

  // strlog({ pms, skipDays })
  

  const withTodayTrend = (await addTodayTrendToStrategies(asArray))
    // .filter(t => t.strategyName.includes('spy'))
    // .filter(s => s.count >= 2)
    // .filter(s => s.todayCount <= 3 && s.todayCount);


  strlog('---------------------------');
  strlog('STRATEGIES WITH TODAY TREND')
  strlog('---------------------------')

  const highestPercUp = withTodayTrend.sort((a, b) => b.percUp - a.percUp);
  const mult = withTodayTrend
    .map(s => ({
      ...s,
      mult: s.overallAvg * s.percUp
    }))
    .filter(s => s.mult)
    .sort((a, b) => b.mult - a.mult);

  strlog({
    withTodayTrend,
    highestPercUp: highestPercUp.slice(0, 30),
    multi: mult.slice(0, 40)
  })



  // NOW PMS

  const stratMatchesPm = (pm, strat) => {
    return pm.some(parts => {
        parts = Array.isArray(parts) ? parts : [parts];
        return parts.every(part => {
          part = part.toString();
          if (part.startsWith('!')) {
            return !strat.includes(part.slice(1));
          }
          return (new RegExp(`(?<!!)${part}-`)).test(strat);
        });
    });
  };

  const stratManager = require('../../socket-server/strat-manager');
  const pmPerfs = stratManager.calcPmPerfs();
  // strlog({ pmPerfs })
  const organized = Object.keys(pms)
    .map(pm => {

      const matchedStrategies = asArray
        .filter(({ strategyName }) => stratMatchesPm(pms[pm], strategyName));

      const byDate = matchedStrategies.reduce((acc, { dateObj }) => {

        Object.entries(dateObj).forEach(([ date, avgTrend ]) => {
          acc[date] = [
            ...acc[date] || [],
            avgTrend
          ];
        });

        return acc;

      }, {});

      const analyzedDates = mapObject(
        byDate,
        trends => avgArray(trends.filter(Boolean))
      );

      const dateVals = Object.values(analyzedDates).filter(Boolean);


      // console.log({ matchedStrategies, byDate });
      
      return {
        pm,
        analyzedDates,
        overallAvg: avgArray(dateVals),
        percUp: percUp(dateVals),
        todayTrend: (pmPerfs.find(({ pmName }) => pmName === pm) || {}).avgTrend
      };

    })
    .filter(s => s.overallAvg)
    .sort((a, b) => b.overallAvg - a.overallAvg);

  const successfulPms = organized
    // .filter(s => s.trends)
    // .filter(s => s.count < 20 && s.count > 1);

  strlog('---------------------------')
  strlog("PMS WITH TODAY TREND")
  strlog('---------------------------')
  
  
  strlog({ successfulPms })



  strlog('---------------------------')
  strlog('RECOMMENDATIONS FOR TOMORROW')
  strlog('---------------------------')

  strlog(mapObject({
    strategies: uniq(
      [withTodayTrend, highestPercUp].flatten(),
      s => s.strategyName
    )
      .filter(s => Object.values(s.dateObj).every(t => t > -3))
      .filter(s => s.trendCount > 5)
      // .filter(s => s.trendPercUp > 50)
      // .filter(s => s.todayCount === 1)
      // .filter(s => s.todayTrend > 0.5)
      .sort((a, b) => b.overallAvg - a.overallAvg),
    pms: successfulPms
      // .filter(t => t.todayTrend > -0.2)
  }, s => s
    .slice(0, 200))
  )


  return {
    pmsAnalyzed: organized
  };

  // strlog({ allStratPerfs })
  // strlog({ count: allStratPerfs.length })

  // const byPm = allPms.reduce((acc, pmPerf) => {
  //   pmPerf.perfs.forEach(perf => {
  //     acc[perf.pmName] = [
  //       ...acc[perf.pmName] || [],
  //       perf.avgTrend
  //     ];
  //   });
  //   return acc;
  // }, {});

  // strlog({ byPm })

  // const analyzed = mapObject(byPm, avgArray);
  // return Object.keys(analyzed)
  //   .sort((a, b) => analyzed[b] - analyzed[a])
  //   .map(key => ({
  //     pm: key,
  //     avg: analyzed[key].twoDec(),
  //     count: byPm[key].length,
  //     values: byPm[key].map(n => n.twoDec())
  //   }));

  // strlog(analyzed);
};