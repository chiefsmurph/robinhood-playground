const Pick = require('../models/Pick');
const getHistoricals = require('../realtime/historicals/get');
const getTrend = require('../utils/get-trend');

module.exports = async () => {

  let response = await getHistoricals(['SPY', 'VIIX'], 'd', 'year');
  strlog({ response })
  const { SPY: dailySpy, VIIX: dailyVix }  = response;
  const combined = dailySpy.map((hist, index, arr) => ({
    // ...hist,
    date: (new Date(new Date(hist.begins_at).getTime() + 1000 * 60 * 60 * 24)).toLocaleDateString(),
    spyOvernight: getTrend(hist.open_price, (arr[index-1] || {}).close_price),
    spyTrend: hist.trend,
    spyDistance: getTrend(hist.high_price, hist.low_price),
    vixOvernight: getTrend(dailyVix[index].open_price, (dailyVix[index-1] || {}).close_price)
  }));

  strlog({ dailySpy});
  const getPicksForDate = date => 
    Pick.find(
      { 
        date,
        // strategyName: /.*sudden.*drops.*mediumJump.*/i
      },
      { data: 0 }
    ).lean();

  const allDates = await Pick.getUniqueDates();
  strlog({ allDates })
  const byDate = await mapLimit(
    allDates,
    1,
    async date => {
      const picks = await getPicksForDate(date);
      console.log(`done with ${date}`);
      return {
        date,
        picks
      };
    }
  );

  return byDate.map(({ date, picks }) => {
    const getCount = (yes = [], no = [], isRecommended) => 
      picks.filter(pick => (
        yes.every(w => pick.strategyName.includes(w)) &&
        no.every(w => !pick.strategyName.includes(w)) &&
        (isRecommended === undefined || pick.isRecommended === isRecommended)
      )).length;
    return {
      date,
      ...combined.find(hist => hist.date === date),
      // spyOvernightTrend: (dailySpy.find).overnightTrend,
      numSuddenDrops: getCount(['sudden-drop']),
      numMediumDrops: getCount(['sudden', 'mediumJump']),
      numMajorDrops: getCount(['sudden', 'majorJump']),
      numDropsRecommended: getCount(['sudden'], undefined, true),
      // numPicks: picks.filter(pick => !pick.strategyName.includes('average')).length,
      // numSudden: picks.filter(pick => pick.strategyName.includes('sudden')).length,
      // numRecommended: picks.filter(pick => pick.isRecommended).length,
      // notDowners: picks.filter(pick => pick.isRecommended && pick.strategyName.includes('avg-down')).length,
      // numRecommendedDrops: picks.filter(pick => pick.isRecommended && pick.strategyName.includes('sudden')).length,
      // numNotInitial: picks.filter(pick => !pick.strategyName.includes('initial')).length,
      // picks
    };
  });


}