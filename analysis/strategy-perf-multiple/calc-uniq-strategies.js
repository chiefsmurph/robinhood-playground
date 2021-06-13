module.exports = stratObj => {
    const stratNames = [];
    Object.keys(stratObj).forEach(date => {
        Object.keys(stratObj[date]).forEach(timeKey => {
            const strats = stratObj[date][timeKey];
            strats.forEach(strat => {
                stratNames.push(strat.strategyName);
            });
        });
    });
    return [...new Set(stratNames)]
        // .filter(s => !s.includes('cheapest-picks'));
};
