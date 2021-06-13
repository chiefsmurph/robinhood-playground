const { mapObject, prefixKeys } = require('underscore');

const data = {

  // RSI
  rsi30: `
    rsi-fitty-30min-rsilt5-under2-firstAlert-notWatchout-lunch-5000
    rsi-fitty-30min-rsilt5-under2-notWatchout-dinner-5000
    rsi-fitty-30min-rsilt15-under2-notWatchout-dinner-5000
    rsi-fitty-30min-rsilt25-under2-notWatchout-dinner-5000
  `,
  rsiDaily: `
    rsi-fitty-daily-rsilt20-firstAlert-notWatchout-lunch-5000
  `,
  rsi10: `
    rsi-fitty-10min-rsilt5-under2-firstAlert-notWatchout-initial-5000
    rsi-fitty-10min-rsilt5-under2-notWatchout-initial-5000
  `,

  // PENNYSCANS
  pennyscans: `
    pennyscan-hot-st-projectedVolume-firstAlert-shouldWatchout-initial-5000
    pennyscan-hot-st-projectedVolume-firstAlert-shouldWatchout-lunch-5000
    pennyscan-nowheres-projectedVolume-firstAlert-notWatchout-dinner-5000
    pennyscan-nowheres-ssFirstTwo-firstAlert-notWatchout-dinner-5000
    pennyscan-hot-st-zScoreInverseTrendPlusVol-firstAlert-shouldWatchout-initial-5000
    pennyscan-unfiltered-zScoreInverseTrendPlusVol-firstAlert-notWatchout-dinner-5000
    pennyscan-nowheres-zScoreInverseTrendPlusVol-firstAlert-notWatchout-lunch-5000
    pennyscan-droppers-worstSS-firstAlert-notWatchout-initial-5000
    pennyscan-droppers-worstSsTrendRatio-firstAlert-notWatchout-dinner-5000
    pennyscan-droppers-worstSS-firstAlert-shouldWatchout-initial-5000
    pennyscan-nowheres-worstSS-firstAlert-notWatchout-dinner-5000

    pennyscan-hot-st-projectedVolume-firstAlert-notWatchout-dinner-5000
    pennyscan-unfiltered-singleTopVolumeSS-firstAlert-notWatchout-lunch-5000
    pennyscan-droppers-worstSS-firstAlert-shouldWatchout-lunch-5000
  `,

  morePennyScans: [

    'pennyscan-hot-st-ssFirstTwo-firstAlert-shouldWatchout-initial-5000',
    'pennyscan-nowheres-worstSsTrendRatio-firstAlert-shouldWatchout-initial-5000',
    'pennyscan-unfiltered-worstSS-firstAlert-shouldWatchout-initial-5000',
    'pennyscan-droppers-worstSsTrendRatio-firstAlert-shouldWatchout-dinner-5000',
    'pennyscan-unfiltered-singleTopVolumeSS-firstAlert-shouldWatchout-lunch-5000',
    'pennyscan-hot-st-ssFirstTwo-firstAlert-shouldWatchout-lunch-5000',
    'pennyscan-droppers-singlePercMaxVolSS-firstAlert-shouldWatchout-lunch-5000',
    'pennyscan-droppers-singleTopVolumeSS-firstAlert-shouldWatchout-lunch-5000',


    'pennyscan-nowheres-worstSS-firstAlert-shouldWatchout-initial-5000',
    'pennyscan-nowheres-worstSS-firstAlert-nowWatchout-initial-5000',
    'pennyscan-nowheres-worstSS-firstAlert-shouldWatchout-lunch-5000',
    'pennyscan-nowheres-worstSS-firstAlert-nowWatchout-lunch-5000',

    'pennyscan-unfiltered-zScoreHotAndCool-firstAlert-shouldWatchout-initial-5000',
  ],

  smoothKST: `
    smoothkst-fitty-10min-bearishSignal-under2-firstAlert-notWatchout-dinner-5000
    smoothkst-fitty-precededByRSI-10min-isSignalCross-under2-firstAlert-notWatchout-initial-5000
  `,
  sma: `
    sma-fitty-5min-bearishCross-under2-notWatchout-brunch-5000
    sma-fitty-10min-bearishCross-under2-firstAlert-notWatchout-lunch-5000
  `,
  ema: `
    ema-fitty-30min-bullishCross-under2-firstAlert-shouldWatchout-lunch-5000
    ema-fitty-30min-bearishCross-under2-shouldWatchout-lunch-5000
    ema-fitty-10min-bearishCross-under2-notWatchout-dinner-5000
  `,

  macd: `macd-fitty-30min-bearishSignal-under2-notWatchout-dinner-5000`,

  multiHits: `
    multi-hits-fitty-4count-under2-notWatchout-lunch-5000
    multi-hits-fitty-3count-under2-firstAlert-notWatchout-lunch-5000
  `,

  sep15Unfiltered: `
    pennyscan-unfiltered-singlePercMaxVolSS-firstAlert-notWatchout-lunch-5000
    pennyscan-unfiltered-singlePercMaxVolSS-firstAlert-notWatchout-initial-5000
    pennyscan-unfiltered-singlePercMaxVolSS-firstAlert-notWatchout-dinner-5000
    pennyscan-unfiltered-stTrendRatioFirst3-firstAlert-notWatchout-brunch-5000
  `,

  // pennyscan-nowheres-zScoreVolume-firstAlert-notWatchout-dinner-5000
  sep15: `
    pennyscan-nowheres-highestTrend-firstAlert-notWatchout-initial-5000
    
    pennyscan-nowheres-zScoreHighSentLowRSI-firstAlert-notWatchout-lunch-500


    pennyscan-droppers-worstSsTrendRatio-firstAlert-shouldWatchout-initial-5000
    pennyscan-droppers-projectedVolume-firstAlert-notWatchout-dinner-5000



    pennyscan-hot-st-zScoreInverseTrendPlusVol-firstAlert-notWatchout-dinner-500
    pennyscan-hot-st-zScoreHighSentLowRSI-firstAlert-notWatchout-dinner-500
    pennyscan-hot-st-zScoreHotAndCool-firstAlert-notWatchout-dinner-5000
    
    
    rsi-fitty-30min-rsilt15-under2-notWatchout-dinner-5000
    ema-fitty-10min-bearishCross-under2-firstAlert-notWatchout-initial-5000
    ema-fitty-10min-bearishCross-under2-firstAlert-shouldWatchout-brunch-500
    kst-fitty-30min-bearishSignal-under2-firstAlert-shouldWatchout-brunch-500
    macd-fitty-30min-bearishSignal-under2-firstAlert-shouldWatchout-brunch-5000
  ` ,

  
  sep16: `
  
    pennyscan-volume-increasing-5min-firstAlert-notWatchout-dinner-5000
    ema-fitty-10min-bearishCross-under2-firstAlert-shouldWatchout-dinner-5000
    pennyscan-unfiltered-singleTopVolumeSS-firstAlert-shouldWatchout-lunch-5000
    pennyscan-hot-st-zScoreHotAndCool-firstAlert-notWatchout-dinner-5000
    sma-fitty-10min-bearishCross-under2-firstAlert-notWatchout-lunch-5000
    kst-fitty-30min-bearishSignal-under2-shouldWatchout-brunch-5000
    pennyscan-hot-st-zScoreMagic-firstAlert-notWatchout-dinner-5000
    
  `,


  // sma-fitty-5min-bearishCross-under2-firstAlert-notWatchout-initial-5000
  sep17: `
    pennyscan-hot-st-worstSS-firstAlert-notWatchout-brunch-5000
    pennyscan-droppers-worstSsTrendRatio-firstAlert-shouldWatchout-dinner-5000

    most-picked-fitty-10min-min160-under2-notWatchout-lunch-5000
    smoothkst-fitty-10min-bearishSignal-under2-shouldWatchout-lunch-5000
    rsi-fitty-10min-rsilt25-under2-firstAlert-shouldWatchout-brunch-5000
    pennyscan-nowheres-zScoreGoingBadLookingGood-firstAlert-shouldWatchout-lunch-5000
    pennyscan-hot-st-projectedVolume-firstAlert-notWatchout-dinner-5000
  `,

  sep18: `
    pennyscan-droppers-singlePercMaxVolSS-firstAlert-notWatchout-brunch-5000
    pennyscan-droppers-singleTopVolumeSS-firstAlert-notWatchout-brunch-5000
    stocktwits-fitty-mostBullish-under2-notWatchout-brunch-5000
    smoothkst-fitty-10min-bearishSignal-under2-notWatchout-initial-5000
    kst-fitty-30min-bearishSignal-under2-firstAlert-shouldWatchout-initial-5000
    pennyscan-hot-st-worstSS-brunch
    pennyscan-highHit360-streak1-firstAlert-notWatchout-lunch-5000
  `

};

const asArrays = mapObject(data, str => Array.isArray(str) ? str : str.split('\n').map(line => line.trim()).filter(Boolean));
const prefixed = prefixKeys(asArrays, 'sep2019-');

module.exports = prefixed;