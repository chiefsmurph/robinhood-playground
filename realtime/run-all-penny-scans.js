const breakdowns = picks => {
  const singleTopVolumeSS = picks
    .sort((a, b) => b.projectedVolume - a.projectedVolume)
    .slice(0, 10)
    .sort((a, b) => b.stSent - a.stSent)
    .slice(0, 1);
  const singlePercMaxVolSS = picks
    .sort((a, b) => b.percMaxVol - a.percMaxVol)
    .slice(0, 8)
    .sort((a, b) => b.stSent - a.stSent)
    .slice(0, 1);
  const ss180 = picks
    .sort((a, b) => b.stSent - a.stSent)
    .filter(pick => pick.stSent >= 180);
  const ssFirstTwo = picks
    .sort((a, b) => b.stSent - a.stSent)
    .slice(0, 2);
  const stTrendRatioFirst3 = picks
    .sort((a, b) => b.stTrendRatio - a.stTrendRatio)
    .slice(0, 3);
  const worstSsTrendRatio = picks
    .sort((a, b) => a.stTrendRatio - b.stTrendRatio)
    .slice(0, 2);
  const worstSS = picks
    .sort((a, b) => a.stSent - b.stSent)
    .slice(0, 1);

    
  return {

    singleTopVolumeSS,
    singlePercMaxVolSS,
    ss180,
    ssFirstTwo,
    stTrendRatioFirst3,
    worstSsTrendRatio,
    worstSS,
    
    ...`
      projectedVolume
      dollarVolume
      highestTrend
      
      zScoreVolume
      zScoreInverseTrend
      zScoreInverseTrendMinusRSI
      zScoreInverseTrendPlusVol
      zScoreHighSentLowRSI
      zScoreMagic
      zScoreHotAndCool
      zScoreGoingBadLookingGood
    `
        .split('\n')
        .map(t => t.trim())
        .filter(Boolean)
        .reduce((acc, key) => ({
          ...acc,
          [key]: picks
            .sort((a, b) => b[key] - a[key])
            .slice(0, 1)
        }), {})
    
  };
};

const scans = [
  'nowheres',
  'hot-st',
  'droppers',
  'unfiltered',
];

module.exports = async () => {

  let picks = [];
  for (let scan of scans) {
    const scanFn = require(`../scans/${scan}`);
    console.log('running ', scan, 'PENNY SCAN');
    const response = await scanFn();
    const brokenDown = breakdowns(response);
    Object.keys(brokenDown).forEach(subset => {

      brokenDown[subset].forEach(pick => {
        const { ticker, ...rest } = pick;
        picks.push({
          ticker,
          strategyName: 'pennyscan',
          keys: {
            [scan]: true,
            [subset]: true
          },
          data: rest
        });
      });

    });

  }


  // volume increasing scans 
  const volIncreasing = [
    'volume-increasing-5min', 
    'volume-increasing-10min'
  ];

  for (let scan of volIncreasing) {
    const scanFn = require(`../scans/${scan}`);
    console.log('running ', scan, 'PENNY SCAN');
    const response = await scanFn();
    response.forEach(pick => {
      const { ticker, ...rest } = pick;
      const { stSent } = rest;
      // if (stSent > 80) {
        picks.push({
          ticker,
          strategyName: 'pennyscan',
          keys: {
            [scan]: true,
          },
          data: rest
        });
      // }
    });
  }

  const newHighs = await require('../scans/base/new-highs')();
  picks = [
    ...picks,
    ...newHighs.map(({ ticker, period, streak }) => ({
      ticker,
      strategyName: 'pennyscan',
      keys: {
        [`highHit${period}`]: true,
        [`streak${streak}`]: true,
      }
    }))
  ];

  return picks;

};