const getSubsets = require('./get-subsets');
const { mapObject } = require('underscore');
const { sumArray } = require('../../utils/array-math');
const { avoidSubsets = [], overallOffset } = require('../../settings');

const subsetOffsets = {
  // allPositions: () => true,
  // withoutKEG: ({ ticker }) => ticker !== 'KEG',
  // lastFive: ({ date }) => lastFive.includes(date),
  // yesterday: ({ date }) => allDates[1] === date,
  // today: ({ date }) => allDates[0] === date,

  suddenDrops: 3,
  
  watchout: 2,
  // notWatchout: 3,
  // watchoutMajorJump: 2,

  bullish: 2,
  neutral: 1,
  bearish: -5,

  bullishMajorJump: 6,

  majorJump: 3,
  mediumJump: 7,
  minorJump: -4,
  onlyMinorJump: -3,

  // singleMultiplier: -0.5,
  // multipleMultipliers: ({ numMultipliers }) => numMultipliers > 1,
  // singlePick: -0.5,
  // multiplePicks: ({ numPicks }) => numPicks > 1,
  // notWatchoutMajorJump: 2,
  // notWatchoutMajorJumpNotStraightDowner: 1,

  straightDowner: -10,
  // straightDown30: 2,
  // straightDown120: 4,
  notStraightDowner: 9,
  // straightDowner: ({ interestingWords }) => interestingWords.some(val => val.startsWith('straightDown')),

  bigDowner: 6,

  straightDownerWatchout: 5,
  notStraightDownerNotWatchout: 15,

  onlyMinorJumpBigDowner: 10,

  
  firstAlert: 1,
  // notFirstAlert: 0,
  avgh: 0,
  notAvgh: 7,
  // hotSt: -1,
  notHotSt: 2,
  // collections
  zeroToOne: 4,
  lowVolFitty: 7,
  oneToTwo: 2,
  fitty: 4,
  fiveToTen: 3,

  // minKey
  initial: -10,
  brunch: 6,
  lunch: 0,
  dinner: 8,
  afterhours: Number.NEGATIVE_INFINITY,

  initialNotWatchout: 5,

  // combos
  oneToTwoAndLunch: 5,
  overnightDrops: -5,
  

  spread1: 4,
  spread2: -1,
  spread3: 1,
  spread4: 1,
  spread5: 1,
  spread6: 0,

  down10: 2,
  down15: 0,
  down20: 2,
  down30: 3,
  down40: 4,
  notDown: 9,

  tenMinMinors: -10,

  halt: -9,
  rocket: 3,
  delist: -3,

  avgDowner: -20,
  avgDowner0: 1,
  avgDowner1: 1,
  avgDowner2: 1,
  avgDowner3: 3,
  avgDowner6: 3,
  avgDownerUnder120Min: 5,
  avgDownerUnder1Min: 22,
  avgDownerUnder5Min: 25,
  avgDownerUnder30Min: 25,
  
  'reverse split': -3,
  coronavirus: 3,
  split: -3,


  isJimmyPick: 3,
  rsi: 6,

  dailyRSIgt70: 5,
  dailyRSIgt50: 1,
  dailyRSIgt50: 2,
  dailyRSIlt30: -2,

};


module.exports = position => {
  // interestingWords = 'sudden drops !watchout brunch bullish mediumJump !down hotSt 5min avgh10 spread3 firstAlert'.split(' ');
  // const position = { interestingWords };

  const subsets = getSubsets([position]);
  const withOffsets = mapObject(
    subsets, 
    (filterFn, key) => 
      filterFn(position) 
        ? subsetOffsets[key] 
        : undefined
  );
  const { ticker, interestingWords } = position;
  const data = {ticker, interestingWords, withOffsets};
  strlog(data)

  const totals = Object.values(withOffsets);
  return sumArray(totals.filter(Boolean)) + overallOffset;
}