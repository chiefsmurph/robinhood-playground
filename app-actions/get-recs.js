const Pick = require('../models/Pick');
const { difference, partition } = require('underscore');
const cachedPositions = require('../utils/cached-positions');

module.exports = async (_, pennyPicks) => {


  // what to buy
  const uniqDates = await Pick.getUniqueDates();
  const mostRecent = uniqDates.pop();


  const isPennyScanOfInterest = keys => (
    [
      'hot-st',
      'droppers'
    ].some(k => keys.includes(k))
  ) && (
    keys.includes('ssFirstTwo') ||
    keys.includes('singleTopVolumeSS')
  );
  const volumeIncreasingWatchout = ({ strategyName }) => [
    'volume-increasing-10min', 'shouldWatchout'
  ].every(k => strategyName.includes(k));
  const pennyFinds = (
    await Pick.find({ date: mostRecent, strategyName: /penny/ }).lean()
  ).filter(pick => {
    const keys = Object.keys(pick.keys || {});
    console.log(pick)
    return volumeIncreasingWatchout(pick) || isPennyScanOfInterest(keys)
  });

  const [lastHour, lastThreeDays] = partition(pennyFinds, pick => {
    return new Date(pick.timestamp).getTime() > Date.now() - 1000 * 60 * 60;
  });

  const getPicksTickers = picks => picks.map(pick => pick.picks[0].ticker).uniq();

  const newTickers = difference(...[
    lastHour,
    lastThreeDays
  ].map(getPicksTickers));

  strlog({
    newTickers,
    compares: [
      lastHour,
      lastThreeDays
    ].map(getPicksTickers)
  });

  // const uniqTickers = pennyFinds.map(pick => pick.picks[0].ticker).uniq();
  // strlog({ uniqTickers });
  // const newTickers = difference(uniqTickers, lastRecs);
  // lastRecs = uniqTickers;


  // what to sell

  const nonZero = await cachedPositions();
  const shouldSells = nonZero.filter(pos => pos.shouldSell);

  return {
    buy: newTickers,
    sell: shouldSells.map(pos => pos.ticker).uniq()
  };
};


