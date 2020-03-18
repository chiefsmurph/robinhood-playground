const Pick = require('../models/Pick');

module.exports = async () => {

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
    allDates.slice(-30),
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


  return byDate.map(({ date, picks }) => ({
    date,
    numPicks: picks.filter(pick => !pick.strategyName.includes('average')).length,
    numSudden: picks.filter(pick => pick.strategyName.includes('sudden')).length,
    numRecommended: picks.filter(pick => pick.isRecommended).length,
    notDowners: picks.filter(pick => pick.isRecommended && pick.strategyName.includes('avg-down')).length,
    numRecommendedDrops: picks.filter(pick => pick.isRecommended && pick.strategyName.includes('sudden')).length,
    numNotInitial: picks.filter(pick => !pick.strategyName.includes('initial')).length,
    // picks
  }));


}