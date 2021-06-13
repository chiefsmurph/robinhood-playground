const fs = require('mz/fs');
const jsonMgr = require('../utils/json-mgr');

module.exports = async (daysBack = 1) => {

    let folders = await fs.readdir('./json/picks-data');

    let sortedFolders = folders.sort((a, b) => {
        return new Date(a) - new Date(b);
    });

    const dayOfInterest = sortedFolders[sortedFolders.length - daysBack];
    if (!dayOfInterest) {
        return console.log('invalid days back param');
    }

    console.log('dayOfInterest', dayOfInterest);

    let picks = await fs.readdir(`./json/picks-data/${dayOfInterest}`);

    const stocksRoundup = {};
    const picksOfInterest = picks.filter(pick => [
        'constant-risers',
        'cheapest-picks'
    ].every(strat => !pick.includes(strat)));
    for (let strategy of picksOfInterest) {
        console.log('strat', strategy);
        const json = await jsonMgr.get(`./json/picks-data/${dayOfInterest}/${strategy}`);
        console.log(json);
        Object.keys(json).filter(runMin => runMin < 100).forEach(runMin => {
            const picksArr = json[runMin];
            picksArr.forEach(pickObj => {
                stocksRoundup[pickObj.ticker] = (stocksRoundup[pickObj.ticker] || [])
                    .concat({
                        price: pickObj.price,
                        strategy: strategy.slice(0, -5) + '-' + runMin
                    });
            });
        });
    }

    const stocksRoundupArr = Object.keys(stocksRoundup)
        .map(ticker => {
            return {
                ticker,
                numPicked: stocksRoundup[ticker].length,
                picks: stocksRoundup[ticker],
            };
        })
        .sort((a, b) => b.numPicked - a.numPicked);

    console.log(JSON.stringify(stocksRoundupArr, null, 2));

};
