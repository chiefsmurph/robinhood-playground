const Pick = require('../models/Pick');

module.exports = async () => {

  const getPicksForDate = date => 
    Pick.find(
      { 
        date,
        isRecommended: true
      },
      { data: 0 }
    ).lean();

  const allDates = await Pick.getUniqueDates();
  strlog({ allDates })
  const byDate = await mapLimit(
    allDates.slice(-6),
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
    numPicks: picks.filter(pick => !pick.strategyName.includes('average')).length
  }));


}