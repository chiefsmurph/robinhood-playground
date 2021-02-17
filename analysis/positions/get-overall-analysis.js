const { groupBy, mapObject } = require('underscore');
const analyzeGroup = require('./analyze-group');

module.exports = positions => {
  const allDates = positions.map(pos => pos.date).uniq();
  const lastFive = allDates.slice(0, 5);
  // strlog({ allDates, lastFive })
  
  const notWatchout = ({ interestingWords }) => interestingWords.includes('!watchout');
  const majorJump = ({ interestingWords }) => interestingWords.includes('majorJump');
  const bearish = ({ interestingWords }) => interestingWords.includes('bearish');
  const notStraightDowner = ({ interestingWords }) => interestingWords.includes('!straightDown');


  const lunch = ({ interestingWords }) => interestingWords.includes('lunch');
  const oneToTwo = ({ interestingWords }) => interestingWords.includes('oneToTwo');

  const overall = mapObject({
    allPositions: undefined,
    withoutKEG: ({ ticker }) => ticker !== 'KEG',
    lastFive: ({ date }) => lastFive.includes(date),
    yesterday: ({ date }) => allDates[1] === date,
    today: ({ date }) => allDates[0] === date,
    watchout: ({ interestingWords }) => interestingWords.includes('watchout'),
    notWatchout,
    bullish: ({ interestingWords }) => interestingWords.includes('bullish'),
    neutral: ({ interestingWords }) => interestingWords.includes('neutral'),
    bearish,
    majorJump,
    mediumJump: ({ interestingWords }) => interestingWords.includes('mediumJump'),
    minorJump: ({ interestingWords }) => interestingWords.includes('minorJump'),
    singleMultiplier: ({ numMultipliers }) => numMultipliers === 1,
    multipleMultipliers: ({ numMultipliers }) => numMultipliers > 1,
    singlePick: ({ numPicks }) => numPicks === 1,
    multiplePicks: ({ numPicks }) => numPicks > 1,
    notWatchoutMajorJump: position => notWatchout(position) && majorJump(position),
    notWatchoutMajorJumpNotStraightDowner: position => notWatchout(position) && majorJump(position) && notStraightDowner(position),
    straightDowner: ({ interestingWords }) => interestingWords.some(val => val.startsWith('straightDown')),
    notStraightDowner,
    straightDowner: ({ interestingWords }) => interestingWords.some(val => val.startsWith('straightDown')),
    firstAlert: ({ interestingWords }) => interestingWords.includes('firstAlert'),
    notFirstAlert: ({ interestingWords }) => !interestingWords.includes('firstAlert'),
    avgh: ({ interestingWords }) => interestingWords.some(val => val.startsWith('avgh')),
    notAvgh: ({ interestingWords }) => !interestingWords.some(val => val.startsWith('avgh')),
    hotSt: ({ interestingWords }) => interestingWords.includes('hotSt'),
    notHotSt: ({ interestingWords }) => !interestingWords.includes('hotSt'),
    // collections
    zeroToOne: ({ interestingWords }) => interestingWords.includes('zeroToOne'),
    oneToTwo,
    fitty: ({ interestingWords }) => interestingWords.includes('fitty'),
    fiveToTen: ({ interestingWords }) => interestingWords.includes('fiveToTen'),

    // minKey
    initial: ({ interestingWords }) => interestingWords.includes('initial'),
    brunch: ({ interestingWords }) => interestingWords.includes('brunch'),
    lunch,
    afterhours: ({ interestingWords }) => interestingWords.includes('afterhours'),

    // combos
    oneToTwoAndLunch: p => lunch(p) && oneToTwo(p),

  }, (filterFn = () => true) => 
    analyzeGroup(
      positions.filter(filterFn)
    )
  );

  return overall;
};