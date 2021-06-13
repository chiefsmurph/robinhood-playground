const getDailyKeys = require('../utils/get-daily-keys');
const Pick = require('../models/Pick');


module.exports = async () => {
  const todaysPicks = await Pick.find(
      { date: '1-27-2020' },
      { data: 0 }
  ).lean();

  strlog({ todaysPicks: todaysPicks.length})
  const drops = todaysPicks.filter(({ strategyName }) => {
    return strategyName.includes('sudden-')
  });
  
  strlog({ drops });

  const allTickers = await mapLimit(drops, 2, async pick => {
    const [{ ticker }] = pick.picks;
    return {
      ticker,
      downKeys: await getDailyKeys(ticker)
    }
  });

  return allTickers;
}