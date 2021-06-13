const Pick = require('../models/Pick');

const INCLUDE = ['down'];
const DONT_INCLUDE = [];

const { isOvernight } = require('../realtime/strategies/sudden-drops');
const { omit } = require('underscore');

module.exports = async () => {
  const todaysPicks = await Pick.find(
      { date: '10-15-2019' },
  ).lean();


  const junk = todaysPicks.filter(({ strategyName, isRecommended }) => {
    return INCLUDE.every(str => strategyName.includes(str))
    && DONT_INCLUDE.every(str => !strategyName.includes(str))
    && isRecommended
  });

  
  strlog({
    todaysPicks: todaysPicks.length,
    junk: junk.length,
    junk2: junk.slice(0, 50)
  })  

  for (let { _id, strategyName, data, keys } of junk) {
    // if (isOvernight(data.allPrices)) {
      const newSn = strategyName.split(/down.{2}\-/).join('');
      const dataOverwrite = {
        // isRecommended: false,
        strategyName: newSn,
        keys: omit(keys, ['down10', 'down15', 'down20', 'down30', 'down40'])
      };
      strlog({ _id, old: strategyName, newSn, dataOverwrite });
      await Pick.update({
        _id,
      }, dataOverwrite)
    // }
    
  }

  // strlog({
  //   response: await Pick.deleteMany({
  //     _id: { '$in': junk.map(pick => pick._id) }
  //   })
  // })
};