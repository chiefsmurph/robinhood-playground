const { get } = require('underscore');
const getRecentPicks = require('../get-recent-picks');
const getStSentiment = require('../../utils/get-stocktwits-sentiment');

const getTicker = pick => pick.ticker;
const getSt = pick => (
    get(pick.scan, 'stSent', 0) ||
    get(pick.stSent, 'bullBearScore', 0)
);


const getBasedOnRecentPicks = async () => {

    const recentHundredPicks = await getRecentPicks(100, true, true, 'sudden-drops');
    const hundredInverseStTrend = recentHundredPicks
        .map(recentPick => ({
            ...recentPick,
            inverseStTrend: Math.round(recentPick.scan.stSent - (recentPick.trend * 14))
        }))
        .sort((a, b) => b.inverseStTrend - a.inverseStTrend)
        .slice(0, 3);
    await log(`hundredInverseStTrend: ${hundredInverseStTrend.map(pick => [pick.ticker, getSt(pick), pick.inverseStTrend].join(' - ')).join(' and ')}`);



    const recentThreeHundredPicks = await getRecentPicks(300, true, false, 'sudden-drops');


    // ANYTHING DROPPED 20%
    let trendDownBig = recentThreeHundredPicks.filter(pick => pick.trend < -20);
    await log(`trendDownBig: ${trendDownBig.map(getTicker)}`);
    

    // DAILY RSI BELOW 30
    const getRSI = pick => get(pick.scan, 'computed.dailyRSI', 100);
    let rsiOversold = recentThreeHundredPicks
        .sort((a, b) => getRSI(a) - getRSI(b))  // ascending - lowest first
        .filter(pick => getRSI(pick) < 30);
    if (rsiOversold.length > 12) {
        await log(`too many rsiOversold something is up, resetting`, { rsiOversold});
        rsiOversold = [];
    }
    await log(`rsiOversold: ${rsiOversold.map(getTicker)}`);
    

    // ALSO ANYTHING BETWEEN -1 to 15% TRENDING AND HIGH ST (>100 BULLBEARSCORE)
    const readyToGo = recentThreeHundredPicks.filter(pick => pick.trend < 15 && getRSI(pick) < 70);
    // console.log(`readyToGo: ${readyToGo.map(getTicker)}`);

    
    const withStSent = (
        await mapLimit(readyToGo, 3, async pick => ({
            ...pick,
            stSent: await getStSentiment(pick.ticker)
        }))
    ).sort((a, b) => getSt(b) - getSt(a));



    await log(
        withStSent.map(pick => [pick.ticker, getSt(pick)].join(': '))
    );



    const readyToGoAndHighSt = withStSent
        .filter(pick => getSt(pick) > 300)
        .sort((a, b) => getSt(b) - getSt(a))
        .slice(0, 5);
    await log(`readyToGoAndHighSt: ${readyToGoAndHighSt.map(getTicker)}`);


    const topSt = readyToGoAndHighSt.slice(0, 1);
    topSt && await log(`topSt: ${getTicker(topSt)} @ ${getSt(topSt)}`);

    return {
        hundredInverseStTrend,
        trendDownBig,
        rsiOversold,
        readyToGoAndHighSt,
        topSt
    };
};

module.exports = getBasedOnRecentPicks;
