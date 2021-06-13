const allEmaCrossoverWatchers = [
    "ema-crossover-watchers-premarket-sma180trendingUp-5000",
    "ema-crossover-watchers-premarket-sma180trendingUp-highVol-5000",
    "ema-crossover-watchers-premarket-sma180trendingUp-lowVol-5000",
    "ema-crossover-watchers-premarket-5000",
    "ema-crossover-watchers-premarket-highVol-5000",
    "ema-crossover-watchers-premarket-lowVol-5000",
    "ema-crossover-watchers-initial-sma180trendingUp-5000",
    "ema-crossover-watchers-initial-sma180trendingUp-highVol-5000",
    "ema-crossover-watchers-initial-sma180trendingUp-lowVol-5000",
    "ema-crossover-watchers-initial-5000",
    "ema-crossover-watchers-initial-highVol-5000",
    "ema-crossover-watchers-initial-lowVol-5000",
    "ema-crossover-watchers-brunch-sma180trendingUp-5000",
    "ema-crossover-watchers-brunch-sma180trendingUp-highVol-5000",
    "ema-crossover-watchers-brunch-sma180trendingUp-lowVol-5000",
    "ema-crossover-watchers-brunch-5000",
    "ema-crossover-watchers-brunch-highVol-5000",
    "ema-crossover-watchers-brunch-lowVol-5000",
    "ema-crossover-watchers-lunch-sma180trendingUp-5000",
    "ema-crossover-watchers-lunch-sma180trendingUp-highVol-5000",
    "ema-crossover-watchers-lunch-sma180trendingUp-lowVol-5000",
    "ema-crossover-watchers-lunch-5000",
    "ema-crossover-watchers-lunch-highVol-5000",
    "ema-crossover-watchers-lunch-lowVol-5000",
    "ema-crossover-watchers-dinner-sma180trendingUp-5000",
    "ema-crossover-watchers-dinner-sma180trendingUp-highVol-5000",
    "ema-crossover-watchers-dinner-sma180trendingUp-lowVol-5000",
    "ema-crossover-watchers-dinner-5000",
    "ema-crossover-watchers-dinner-highVol-5000",
    "ema-crossover-watchers-dinner-lowVol-5000",
    "ema-crossover-watchers-afterhours-sma180trendingUp-5000",
    "ema-crossover-watchers-afterhours-sma180trendingUp-highVol-5000",
    "ema-crossover-watchers-afterhours-sma180trendingUp-lowVol-5000",
    "ema-crossover-watchers-afterhours-5000",
    "ema-crossover-watchers-afterhours-highVol-5000",
    "ema-crossover-watchers-afterhours-lowVol-5000"
];

const allEmaLastTrades = [
    "ema-crossover-last-trade-sma180trendingUp-24",
    "ema-crossover-last-trade-sma180trendingUp-100",
    "ema-crossover-last-trade-sma180trendingUp-200",
    "ema-crossover-last-trade-sma180trendingUp-330",
    "ema-crossover-last-trade-sma180trendingUp-360",
    "ema-crossover-last-trade-sma180trendingUp-380",
    "ema-crossover-last-trade-allOthers-24",
    "ema-crossover-last-trade-allOthers-100",
    "ema-crossover-last-trade-allOthers-200",
    "ema-crossover-last-trade-allOthers-330",
    "ema-crossover-last-trade-allOthers-360",
    "ema-crossover-last-trade-allOthers-380"
];

const allEmaLastTradeTrendingUp180SMA = allEmaLastTrades.filter(s => s.includes('sma180trendingUp'));

module.exports = { 
    allEmaCrossoverWatchers,
    myEmaCrossoverWatchers: allEmaCrossoverWatchers.filter(s => !s.includes('lowVol')),
    allEmaLastTrades,
    allEmaLastTradeTrendingUp180SMA
};