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

  suddenDrops: 90,
  
  watchout: 2,
  // notWatchout: 3,
  // watchoutMajorJump: 2,

  bullish: -15,
  neutral: 5,
  bearish: 20,

  bullishMajorJump: 6,

  majorJump: 5,
  mediumJump: 10,
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
  notFirstAlert: 30,


  avgh: 0,
  notAvgh: 7,
  hotSt: -19,
  notHotSt: 2,
  // collections
  zeroToOne: 4,
  lowVolFitty: 20,
  oneToTwo: 2,
  fitty: 20,
  fiveToTen: 3,

  // minKey
  initial: -10,
  brunch: 6,
  lunch: 20,
  dinner: 40,
  afterhours: Number.NEGATIVE_INFINITY,

  initialNotWatchout: 5,

  // combos
  oneToTwoAndLunch: 5,
  overnightDrops: -30,
  

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

  halt: -15,
  rocket: 20,
  delist: -3,

  avgDowner: 0,
  avgDowner0: 1,
  avgDowner1: 1,
  avgDowner2: 1,
  avgDowner3: 3,
  avgDowner6: 3,
  avgDownerUnder120Min: 5,
  avgDownerUnder1Min: 22,
  avgDownerUnder5Min: 25,
  avgDownerUnder30Min: 25,
  avgDownerUnder60Min: 25,
  
  'reverse split': -3,
  coronavirus: 3,
  split: -3,


  isJimmyPick: 3,
  rsi: -2,

  dailyRSIgt70: 3,
  dailyRSIgt50: 7,
  dailyRSIgt30: 25,
  dailyRSIlt30: 20,



  gnewscoronavirus: 150

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