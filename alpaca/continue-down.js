const getPositions = require('./get-positions');
const { continueDownForDays } = require('../settings');

module.exports = async () => {
  const positions = await getPositions();
  const underDaysOld = positions.filter(({ daysOld }) => daysOld <= continueDownForDays);
  const suddenDrops = underDaysOld.filter(({ interestingWords = [] }) => interestingWords.includes('sudden'));
  const belowPercent = suddenDrops.filter(({ returnPerc }) => returnPerc < -4);
  const hasDecentMultipliers = belowPercent.filter(({ numMultipliers }) => numMultipliers > 3);
  for (let position of hasDecentMultipliers) {
    const { ticker, daysOld, outsideBracket, returnPerc } = position;
    console.log('continue down', ticker);
    require('../realtime/RealtimeRunner').handlePick({
      strategyName: 'continue-down',
      ticker,
      keys: {
        [`${daysOld}daysOld`]: true,
        outsideBracket,
        downAlot: returnPerc < -10
      },
      data: { 
        position
      }
    }, true);
  }
};