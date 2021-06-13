const fs = require('mz/fs');
const { mapObject } = require('underscore');

const stratPerfOverall = require('../strategy-perf-overall');
const StratPerf = require('../../models/StratPerf');
const getRecsFromFiveDayAndSPM = require('./get-recs-from-fiveday-and-spm');
const { avgArray } = require('../../utils/array-math');

const DAYS_TO_SKIP = 1;
const DAYS_TO_CONSIDER = 8;


const getSpmDates = async () => {
  let files = await fs.readdir('./json/strat-perf-multiples');

  let sortedFiles = files
      .map(f => f.split('.')[0])
      .sort((a, b) => new Date(b) - new Date(a));
  return sortedFiles;
  // return require(`../json/strat-perf-multiples/${sortedFiles[0]}`)
};

module.exports = async (
  daysToConsider = DAYS_TO_CONSIDER, 
  daysToSkip = DAYS_TO_SKIP
) => {

  let dates = await StratPerf.getUniqueDates();
  dates = dates;
  console.log({ dates });

  const ofInterest = dates
    .slice(0, dates.length - daysToSkip)
    .slice(0 - daysToConsider);

  console.log({ ofInterest });


  const filterStrategies = ({ strategyName }) => strategyName.includes('pennyscan');

  const spmDates = await getSpmDates();
  console.log({ spmDates })
  for ([index, date] of ofInterest.reverse().entries()) {
    const skipDays = index + daysToSkip + 1;
    const prevDate = spmDates.find((val, i) => spmDates[i - 1] === date);
    strlog({ date, prevDate });
    const [
      prevFiveDay,
      prevSPM
    ] = [

      // five day
      ((await stratPerfOverall(false, 5, 0, skipDays)).sortedByAvgTrend).map(rec => ({
        ...rec,
        strategyName: rec.name
      })),

      // spm
      require(`../../json/strat-perf-multiples/${prevDate}`).all.map(rec => ({
        ...rec,
        strategyName: rec.strategy
      }))

    ].map(strategies => 
      strategies.filter(filterStrategies)
    );

    const bothRecs = await getRecsFromFiveDayAndSPM(
      prevFiveDay,
      prevSPM
    );
    strlog({ bothRecs })
    const relatedStratPerf = await StratPerf.getByDate(date);

    // strlog({ prevFiveDay })

    const addPerfToRecs = recs => recs
      .map(rec => ({
        ...rec,
        perfs: Object.keys(relatedStratPerf).map(period => 

            relatedStratPerf[period]
              .filter(({ strategyName }) => 
                strategyName === rec.strategyName
              )
              .map(perf => ({
                ...perf,
                period
              }))

        ).flatten()
      }))
      .map(rec => ({
        ...rec,
        avgTrend: avgArray(rec.perfs.map(perf => perf.avgTrend))
      }));
    // strlog({ prevFiveDay })
    strlog(
      mapObject(
        {
          prevFiveDay: addPerfToRecs(prevFiveDay.slice(0, 10)),
          prevSPM: addPerfToRecs(prevSPM.slice(0, 10)),
          bothRecs: addPerfToRecs(bothRecs.slice(0, 20)),
        }, 
        recsWithPerf => avgArray(
          recsWithPerf
            .map(rec => rec.avgTrend)
            .filter(Boolean)
        )
      )
    );


    // const recsWithPerf = 
    // // strlog({ date, recs, relatedStratPerf, recsWithPerf });
    // strlog({ date, avgTrend: avgArray(recsWithPerf.map(rec => rec.avgTrend).filter(Boolean))  })
  }
};