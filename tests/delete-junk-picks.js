const Pick = require('../models/Pick');

const INCLUDE = ['derived'];
const DONT_INCLUDE = [];



module.exports = async () => {
  const todaysPicks = await Pick.find(
      { date: '1-27-2020' },
      { data: 0 }
  ).lean();

  strlog({ todaysPicks: todaysPicks.length})
  const junk = todaysPicks.filter(({ strategyName }) => {
    return INCLUDE.every(str => strategyName.includes(str))
    && DONT_INCLUDE.every(str => !strategyName.includes(str));
  });

  
  strlog({
    todaysPicks: todaysPicks.length,
    junk: junk.length,
    // junk2: junk.slice(0, 50)
  })

  strlog({
    response: await Pick.deleteMany({
      _id: { '$in': junk.map(pick => pick._id) }
    })
  })
};