const watchout = ({ interestingWords }) => interestingWords.includes('watchout');
const notWatchout = ({ interestingWords }) => !interestingWords.includes('watchout');
const bearish = ({ interestingWords }) => interestingWords.includes('bearish');
const notStraightDowner = ({ interestingWords }) => interestingWords.every(word => !word.startsWith('straightDown'));

const minorJump = ({ interestingWords }) => interestingWords.includes('minorJump');
const mediumJump = ({ interestingWords }) => interestingWords.includes('mediumJump');
const majorJump = ({ interestingWords }) => interestingWords.includes('majorJump');

const bullish = ({ interestingWords }) => interestingWords.includes('bullish');

const initial = ({ interestingWords }) => interestingWords.includes('initial');
const lunch = ({ interestingWords }) => interestingWords.includes('lunch');
const oneToTwo = ({ interestingWords }) => interestingWords.includes('oneToTwo');

const straightDowner = ({ interestingWords }) => interestingWords.some(val => val.startsWith('straightDown'));
const straightDown60 = ({ interestingWords }) => interestingWords.some(val => val.startsWith('straightDown60'));
const straightDown120 = ({ interestingWords }) => interestingWords.some(val => val.startsWith('straightDown120'));
const bigDowner = p => straightDown60(p) || straightDown120(p);

const spread1 = ({ interestingWords }) => interestingWords.includes('spread1');
const { wordFlags } = require('../../settings');

module.exports = positions => {

  const allWords = positions.map(pos => pos.interestingWords).flatten().uniq();
  console.log({ allWords})


  const allDates = positions.map(pos => pos.date).uniq().filter(Boolean);
  const lastFive = allDates.slice(0, 5);
  return {
    allPositions: () => true,

    suddenDrops: ({ interestingWords }) => interestingWords.includes('sudden'),
    derived: ({ interestingWords }) => interestingWords.includes('derived'),
    
    withoutKEG: ({ ticker }) => ticker !== 'KEG',
    withoutASLN: ({ ticker }) => ticker !== 'ASLN',
    lastFive: ({ date }) => lastFive.includes(date),
    yesterday: ({ date }) => allDates[1] === date,
    today: ({ date }) => allDates[0] === date,
    watchout,
    notWatchout,
    watchoutMajorJump: p => watchout(p) && majorJump(p),
    bullish,
    neutral: ({ interestingWords }) => interestingWords.includes('neutral'),
    bearish,
    bullishMajorJump: p => bullish(p) && majorJump(p),
    majorJump,
    mediumJump,
    minorJump,
    medOrMajJump: p => mediumJump(p) || majorJump(p),
    onlyMinorJump: p => minorJump(p) && !mediumJump(p) && !majorJump(p),
    onlyMinorJumpSpread1: p => minorJump(p) && !mediumJump(p) && !majorJump(p) && spread1(p),
    onlyMinorJumpBigDowner: p => minorJump(p) && !mediumJump(p) && !majorJump(p) && bigDowner(p),
    singleMultiplier: ({ numMultipliers }) => numMultipliers === 1,
    multipleMultipliers: ({ numMultipliers }) => numMultipliers > 1,
    singlePick: ({ numPicks }) => numPicks === 1,
    multiplePicks: ({ numPicks }) => numPicks > 1,
    notWatchoutMajorJump: position => notWatchout(position) && majorJump(position),
    // notWatchoutMajorJumpNotStraightDowner: position => notWatchout(position) && majorJump(position) && notStraightDowner(position),
    straightDowner,
    straightDown30: ({ interestingWords }) => interestingWords.some(val => val.startsWith('straightDown30')),
    straightDown60,
    straightDown120,
    bigDowner,
    notStraightDowner,
    straightDownerWatchout: p => straightDowner(p) && watchout(p),
    notStraightDownerNotWatchout: p => notStraightDowner(p) && notWatchout(p),
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
    lowVolFitty: ({ interestingWords }) => interestingWords.includes('lowVolFitty'),
    fiveToTen: ({ interestingWords }) => interestingWords.includes('fiveToTen'),
  
    // minKey
    initial,
    brunch: ({ interestingWords }) => interestingWords.includes('brunch'),
    lunch,
    dinner: ({ interestingWords }) => interestingWords.includes('dinner'),
    afterhours: ({ interestingWords }) => interestingWords.includes('afterhours'),

    initialNotWatchout: p => initial(p) && notWatchout(p),
  
    // combos
    oneToTwoAndLunch: p => lunch(p) && oneToTwo(p),
    overnightDrops: ({ interestingWords }) => interestingWords.includes('overnight'),
    
    // spread
    spread1,
    spread2: ({ interestingWords }) => interestingWords.includes('spread2'),
    spread3: ({ interestingWords }) => interestingWords.includes('spread3'),
    spread4: ({ interestingWords }) => interestingWords.includes('spread4'),
    spread5: ({ interestingWords }) => interestingWords.includes('spread5'),
    spread6: ({ interestingWords }) => interestingWords.includes('spread6'),

    // downs
    down10: ({ interestingWords }) => interestingWords.includes('down10'),
    down15: ({ interestingWords }) => interestingWords.includes('down15'),
    down20: ({ interestingWords }) => interestingWords.includes('down20'),
    down30: ({ interestingWords }) => interestingWords.includes('down30'),
    down40: ({ interestingWords }) => interestingWords.includes('down40'),
    notDown: ({ interestingWords }) => interestingWords.includes('!down'),

    tenMinMinors: ({ interestingWords }) => (
      ['10min', 'minorJump'].every(word => interestingWords.includes(word)) &&
      ['mediumJump', 'majorJump'].every(word => !interestingWords.includes(word))
    ),  

    // words

    ...wordFlags.reduce((acc, word) => ({
      ...acc,
      [word]: ({ interestingWords }) => interestingWords.includes(word)
    }), {}),


    // avg downers
    avgDowner: ({ interestingWords }) => interestingWords.includes('avg'),
    avgDowner0: ({ interestingWords }) => interestingWords.includes('0count'),
    avgDowner1: ({ interestingWords }) => interestingWords.includes('1count'),
    avgDowner2: ({ interestingWords }) => interestingWords.includes('2count'),
    avgDowner3: ({ interestingWords }) => interestingWords.includes('3count'),
    avgDowner4: ({ interestingWords }) => interestingWords.includes('4count'),
    avgDowner5: ({ interestingWords }) => interestingWords.includes('5count'),
    avgDowner6: ({ interestingWords }) => interestingWords.includes('6count'),


    avgDownerBeforeClose: ({ interestingWords }) => interestingWords.includes('isBeforeClose'),
    avgDownerUnder1Min: ({ interestingWords }) => interestingWords.includes('under1min'),
    avgDownerUnder5Min: ({ interestingWords }) => interestingWords.includes('under5min'),
    avgDownerUnder30Min: ({ interestingWords }) => interestingWords.includes('under30min'),
    avgDownerUnder60Min: ({ interestingWords }) => interestingWords.includes('under60min'),
    avgDownerUnder120Min: ({ interestingWords }) => interestingWords.includes('under120min'),


    isJimmyPick: ({ interestingWords }) => interestingWords.includes('isJimmyPick'),
    rsi: ({ interestingWords }) => interestingWords.includes('rsi'),
    dailyRSIgt70: ({ interestingWords }) => interestingWords.includes('dailyRSIgt70'),
    
  };
};
