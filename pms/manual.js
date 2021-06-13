const highVolumePicks = [

    'high-volume-sp500-tscPosLt3-absVolume-5',
    'high-volume-sp500-tscPosLt3-volumeTo2Week-5',
    'high-volume-sp500-tscPosLt3-twoWeekToAvg-5',
    'high-volume-sp500-tscPosLt3-volumeToAvg-5',


    'high-volume-sp500-tscLt3-absVolume-5',
    'high-volume-sp500-tscLt3-volumeTo2Week-5',
    'high-volume-sp500-tscLt3-twoWeekToAvg-5',
    'high-volume-sp500-tscLt3-volumeToAvg-5',





    'high-volume-tscPosLt3-absVolume-5',
    'high-volume-tscPosLt3-volumeTo2Week-5',
    'high-volume-tscPosLt3-twoWeekToAvg-5',
    'high-volume-tscPosLt3-volumeToAvg-5',

    'high-volume-tscLt3-absVolume-5',
    'high-volume-tscLt3-volumeTo2Week-5',
    'high-volume-tscLt3-twoWeekToAvg-5',
    'high-volume-tscLt3-volumeToAvg-5',

    'high-volume-tscPosLt3-absVolume-60',
    'high-volume-tscPosLt3-volumeTo2Week-60',
    'high-volume-tscPosLt3-twoWeekToAvg-60',
    'high-volume-tscPosLt3-volumeToAvg-60',

    'high-volume-tscLt3-absVolume-60',
    'high-volume-tscLt3-volumeTo2Week-60',
    'high-volume-tscLt3-twoWeekToAvg-60',
    'high-volume-tscLt3-volumeToAvg-60',
];

const newHighPicks = [
    'new-highs-highestThirtyFiveTo90Ratio-lowestfiveTo35ratio-0',
    'new-highs-overall-lowestfiveTo35ratio-0',
    'new-highs-lowestThirtyFiveTo90RatioSma180Up-highestfiveTo35ratio-0',

    'new-highs-highestThirtyFiveTo90Ratio-lowestfiveTo35ratio-90',
    'new-highs-overall-lowestfiveTo35ratio-90',
    'new-highs-lowestThirtyFiveTo90RatioSma180Up-highestfiveTo35ratio-90',

    'new-highs-top100RH-overall-lowestfiveTo35ratio-0',
    'new-highs-top100RH-overall-lowestfiveTo35ratio-90',
    
    'new-highs-top100RH-highestThirtyFiveTo90RatioSma180Up-lowestfiveTo35ratio-0',
    'new-highs-top100RH-highestThirtyFiveTo90RatioSma180Up-lowestfiveTo35ratio-90',
];

const stockInvest = [
    "stock-invest-top100-4",
    "stock-invest-top100-104",
    "stock-invest-top100-200",
    "stock-invest-undervalued-4",
    "stock-invest-undervalued-104",
    "stock-invest-undervalued-200"
  ];

const murphysAnalytics = [
    'analytic-onlyUp-yesterdayDown-365-heavyTrendScore-volatilityPick-180',
    'analytic-onlyUp-onjn1to1-90-inverseHeavyTrendScore-periodTrendVolatilityPick-250',
    'analytic-onlyUp-yesterdayDown-60-inverseHeavyTrendScore-180',
    'analytic-reversingUp-15-lightTrendScore-95'
];


const feelingGoodInTheNeighborhood = [
    ...highVolumePicks,
    ...newHighPicks,
];


const feb122021RSI = [
    'rsi-twoToFive-10min-rsilt25-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-neutral-notWatchout-brunch-5000',
    'rsi-twoToFive-10min-rsilt25-straightDown30-spread1-avgDollarVolume20000-dailyRSIgt50-firstAlert-neutral-notWatchout-lunch-5000',
    'rsi-twoToFive-10min-rsilt25-straightDown30-spread1-avgDollarVolume20000-dailyRSIgt50-firstAlert-neutral-notWatchout-dinner-5000',
    'rsi-twoToFive-10min-rsilt25-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-neutral-notWatchout-initial-5000',
    'rsi-twoToFive-10min-rsilt25-straightDown60-spread1-avgDollarVolume20000-dailyRSIgt50-neutral-notWatchout-lunch-5000'
];

const feb122021Stocktwits = [
    'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-lunch-5000',
    'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
    'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
    'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-dinner-5000',
    'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-offering-watchout-initial-5000',
    'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-rocket-watchout-dinner-5000',
    'stocktwits-hotSt-mostBullish-spreadgt6-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-afterhours-5000',
    'stocktwits-hotSt-mostBullish-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-afterhours-5000'
];

const feb122021SmoothKST = [
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-initial-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-initial-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-brunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-dinner-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spreadgt6-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-afterhours-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-dinner-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-notWatchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-dinner-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-brunch-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-watchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-offering-watchout-brunch-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
    'smoothkst-hotSt-30min-isZeroCross-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-watchout-dinner-5000',
    'smoothkst-hotSt-10min-isZeroCross-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-initial-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-neutral-watchout-initial-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-watchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-notWatchout-initial-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-offering-watchout-initial-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-rocket-watchout-dinner-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-watchout-initial-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-offering-watchout-afterhours-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-firstAlert-neutral-notWatchout-lunch-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume10000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume10000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-notWatchout-brunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread3-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-afterhours-5000',
    'smoothkst-hotSt-10min-isZeroCross-spread2-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-initial-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-firstAlert-neutral-notWatchout-initial-5000',
    'smoothkst-hotSt-10min-bearishSignal-spreadgt6-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-watchout-afterhours-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-notWatchout-initial-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-firstAlert-bullish-watchout-dinner-5000',
    'smoothkst-hotSt-10min-isZeroCross-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-gnewsrocket-watchout-initial-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-notWatchout-brunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-gnewsrocket-watchout-initial-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread2-avgDollarVolume10000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-notWatchout-initial-5000',
    'smoothkst-hotSt-30min-isZeroCross-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread5-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-firstAlert-bullish-notWatchout-dinner-5000',
    'smoothkst-hotSt-10min-isZeroCross-spread2-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-neutral-watchout-afterhours-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread4-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-notWatchout-afterhours-5000',
    'smoothkst-hotSt-30min-isZeroCross-spread2-avgDollarVolume10000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-notWatchout-brunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume10000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume10000-dailyRSIgt30-notStraightDowner-firstAlert-neutral-notWatchout-lunch-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-lunch-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread3-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-afterhours-5000',
    'smoothkst-hotSt-30min-isSignalCross-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-brunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume3500-dailyRSIgt30-notStraightDowner-firstAlert-neutral-notWatchout-initial-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-rocket-watchout-dinner-5000',
    'smoothkst-hotSt-10min-bearishSignal-spreadgt6-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-neutral-watchout-afterhours-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume10000-dailyRSIgt50-notStraightDowner-neutral-notWatchout-initial-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume3500-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-neutral-notWatchout-dinner-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-offering-watchout-dinner-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-neutral-watchout-lunch-5000',
    'smoothkst-hotSt-30min-isZeroCross-spread2-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spreadgt6-avgDollarVolume20000-dailyRSIgt30-notStraightDowner-neutral-notWatchout-afterhours-5000',
    'smoothkst-hotSt-30min-isSignalCross-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-dinner-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-neutral-watchout-initial-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread5-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-afterhours-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread2-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-watchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-dinner-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-notWatchout-lunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume3500-dailyRSIgt50-notStraightDowner-firstAlert-neutral-notWatchout-initial-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume10000-dailyRSIgt50-notStraightDowner-firstAlert-bullish-notWatchout-brunch-5000',
    'smoothkst-hotSt-10min-isZeroCross-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-firstAlert-bullish-watchout-initial-5000',
    'smoothkst-hotSt-30min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-notWatchout-brunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-watchout-brunch-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume20000-dailyRSIgt70-notStraightDowner-bullish-watchout-afterhours-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread2-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-afterhours-5000',
    'smoothkst-hotSt-10min-bearishSignal-spread1-avgDollarVolume20000-dailyRSIgt50-notStraightDowner-bullish-watchout-dinner-5000'
];




const feb122021 = [
    ...feb122021RSI,
    ...feb122021Stocktwits,
    ...feb122021SmoothKST
];


module.exports = {
    // ...require('./ticker-watchers'),
    // // ...require('./ask-watchers'),
    // ...require('./best-st-sentiment'),
    // ...require('./ema-crossovers'),

    // ...require('./feb13'),

    // ...require('./rsi-watchers'),
    // ...require('./kst-watchers'),

    // onlyUp: require('./only-up'),

    // feelingGoodInTheNeighborhood,
    //     highVolumePicks,
    //     newHighPicks,

    // stockInvest,

    // murphysAnalytics,

    // ...require('./sep-2019'),

    feb122021,
    feb122021RSI,
    feb122021Stocktwits,
    feb122021SmoothKST
};