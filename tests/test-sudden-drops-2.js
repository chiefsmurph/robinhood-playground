const Pick = require('../models/Pick');
const { pick } = require('underscore')
const INCLUDE = ['sudden-drops'];
const DONT_INCLUDE = [];

const calcLowVolWarning = allPrices => {
  const onlyToday = (() => {
    const todayDate = (new Date()).getDate();
    return allPrices
      .filter(({ timestamp }) => 
        (new Date(timestamp)).getDate() === todayDate
      );
  })();

  // if (onlyToday.length < 5) return { count: onlyToday.length };
  const lowVolCount = onlyToday.filter(({ volume }) => volume < 1500).length;
  const lowVolWarning = lowVolCount / onlyToday.length > 0.15;
  return {
    lowVolCount,
    lowVolWarning
  };
}

module.exports = async () => {
  const todaysPicks = await Pick.find(
      { date: '9-25-2019' },
      // { data: 0 }
  ).lean();

  const junk = todaysPicks.filter(({ strategyName, isRecommended }) => {
    return INCLUDE.every(str => strategyName.includes(str))
    && DONT_INCLUDE.every(str => !strategyName.includes(str))
    && isRecommended
  });

  const withAllPrices = junk
    .filter(p => p.data.allPrices)
    .map(p => ({
      // ...p,
      ...pick(p, ['strategyName']),
      ticker: p.picks[0].ticker,
      ...calcLowVolWarning(p.data.allPrices)
    }));

  strlog({
    withAllPrices
  })

  strlog({
    junk: junk.length,
    withAllPrices: withAllPrices.length
  })

}