const Pick = require('../models/Pick');
const { mapObject } = require('underscore');

module.exports = async () => {
  const todaysPicks = await Pick.find(
    { 
      date: '3-10-2020',
      strategyName: /.*sudden.*drops.*(medium|major).*/i
    },
    // { data: 0 }
  ).lean();

  const byNum = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14].reduce((acc, num) => ({
    ...acc,
    [num]: todaysPicks.filter(pick => Math.ceil(pick.data.trendFromMin) === 0 - num).length
  }), {});


  strlog({ todaysPicks, length: todaysPicks.length, byNum });


  

};