const Pick = require('../models/Pick');
const StratPerf = require('../models/StratPerf');

const INCLUDE = ['sudden-drops'];
const DONT_INCLUDE = [];

const { isOvernight } = require('../realtime/strategies/sudden-drops');


const getPicksForTicker = (ticker, date) =>
  Pick.find(
    {
      date,
      picks: {
        $elemMatch: {
          ticker
        }
      }
    }, 
    { data: 0 }
  ).lean()

const getFirstStratPerf = async (stratMin, date) => {
  const foundStratPerf = await StratPerf.findOne(
    {
      date,
      stratMin
    },
  ).lean();
  return !foundStratPerf ? null : foundStratPerf.perfs.filter(perf => perf.period.includes('same-day'))
};


module.exports = async (daysBack = 10) => {

  const dates = await Pick.getUniqueDates();
  const datesOfInterest = dates.slice(0 - daysBack - 1).slice(0, -1);



  strlog({ dates, datesOfInterest })
  
  const foundDrops = await Pick.find(
      { 
        date: { $in : datesOfInterest },
        // strategyName: { $regex : ".*sudden.*major.*" }, 
        strategyName: { $regex : ".*options.*10min.*rsilt.*dinner" }, 
        // isRecommended: true
      },
      { data: 0 }
  ).lean();

  
  strlog({
    foundDrops: foundDrops.length,
    byDate: datesOfInterest.reduce((acc, date) => ({
      ...acc,
      [date]: foundDrops.filter(pick => pick.date === date).length
    }), {})
    // junk2: foundDrops.slice(0, 50)
  });

  const withFollowing = await mapLimit(foundDrops, 1, async pick => {
    const { strategyName, min, picks, date } = pick;
    const dateIndex = dates.indexOf(date);
    const followingDate = dates[dateIndex + 1];
    const stratMin = [strategyName, min].join('-');
    const { ticker } = picks[0];
    return {
      ...pick,
      followingDate,
      // followingPicks: await getPicksForTicker(ticker, followingDate),
      firstStratPerf: await getFirstStratPerf(stratMin, date)
    }
  });

  strlog({ withFollowing })

  
};