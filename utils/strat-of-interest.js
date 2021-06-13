const exactMatches = require('../strats-of-interest');
const keywordMatches = [
    'sudden-drops',
    'best-st-sentiment',
    'cheapest-picks',
    'double-down',
    'ticker-watchers',
    'ask-watchers'
];

const functionMatches = [
    // (s, numPicks) => s.includes('sudden-drops') && numPicks === 1,
    (strat, numPicks) => numPicks === 1,
    strat => {
        const randomMatch = Math.random() < 0.1;
        if (randomMatch) {
            console.log('random match!!', strat);
        }
        return randomMatch;
    },

];
module.exports = (strat, numPicks) => {
    return true;    // for now every logged strat
    const matchesExact = () => exactMatches.includes(strat);
    const matchesKeyword = () => keywordMatches.some(
        test => strat.includes(test)
    );
    const matchesFunction = () => functionMatches.some(fn => fn(strat, numPicks))
    return [matchesKeyword, matchesExact, matchesFunction].some(t => t());
};