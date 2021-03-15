const { get } = require('underscore');
const getRecentPicks = require('../get-recent-picks');
const getStSentiment = require('../../utils/get-stocktwits-sentiment');

const getTicker = pick => pick.ticker;
const getSt = pick => (
    get(pick.scan, 'stSent', 0) ||
    get(pick.stSent, 'bullBearScore', 0)
);
const getRSI = pick => get(pick.scan, 'computed.dailyRSI', 100);


const getReadyToGoWithStWithInverse = async recentPicks => {
    const readyToGo = recentPicks.filter(pick => pick.trend < 15 && getRSI(pick) < 70);
    console.log({
        before: recentPicks.length,
        after: readyToGo.length
    })
    const withStSent = await mapLimit(readyToGo, 3, async pick => ({
        ...pick,
        stSent: await getStSentiment(pick.ticker)
    }));

    return withStSent
        .map(recentPick => ({
            ...recentPick,
            inverseStTrend: Math.round(getSt(recentPick) - (recentPick.trend * 14))
        }))
        .filter(p => p.inverseStTrend)
        .sort((a, b) => b.inverseStTrend - a.inverseStTrend);
};


const getBasedOnRecentPicks = async () => {

    const recentHundredPicks = await getReadyToGoWithStWithInverse(
        await getRecentPicks(100, true, false, 'sudden-drops')
    );
    const hundredInverseStTrend = recentHundredPicks.slice(0, 3);
    await log(`hundredInverseStTrend: ${hundredInverseStTrend.map(pick => [pick.ticker, getSt(pick), pick.inverseStTrend].join(' - ')).join(' and ')}`);


    const recentThreeHundredPicks = await getRecentPicks(300, true, false, 'sudden-drops');


    // ANYTHING DROPPED 20%
    let trendDownBig = recentThreeHundredPicks
        .filter(pick => pick.trend < -20)
        .sort((a, b) => a.trend - b.trend)
        .slice(0, 5);
    await log(`trendDownBig: ${trendDownBig.map(getTicker)}`);
    

    // DAILY RSI BELOW 30
    let rsiOversold = recentThreeHundredPicks
        .sort((a, b) => getRSI(a) - getRSI(b))  // ascending - lowest first
        .filter(pick => getRSI(pick) < 30 && getRSI(pick) > 1)
        .slice(0, 3);
    if (rsiOversold.length > 12) {
        await log(`too many rsiOversold something is up, resetting`, { rsiOversold});
        rsiOversold = [];
    }
    await log(`rsiOversold: ${rsiOversold.map(getTicker)}`);
    

    // readyToGo = ANYTHING BELOW 15% TRENDING
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


    // AND HIGH ST (>300 BULLBEARSCORE)
    const readyToGoAndHighSt = withStSent
        .filter(pick => getSt(pick) > 300)
        .sort((a, b) => getSt(b) - getSt(a))
        .slice(0, 5);
    await log(`readyToGoAndHighSt: ${readyToGoAndHighSt.map(getTicker)}`);


    const topSt = readyToGoAndHighSt.slice(0, 1);
    await log(`topSt: ${topSt.map(getTicker)}`);


    const recentFiveHundredPicks = await getReadyToGoWithStWithInverse(
        await getRecentPicks(500, true, false, 'sudden-drops')
    );
    const fiveHundredInverseStTrend = recentFiveHundredPicks.slice(0, 3);
    await log(`fiveHundredInverseStTrend: ${fiveHundredInverseStTrend.map(pick => [pick.ticker, getSt(pick), pick.inverseStTrend].join(' - ')).join(' and ')}`);



    return {
        hundredInverseStTrend,
        fiveHundredInverseStTrend,
        trendDownBig,
        rsiOversold,
        readyToGoAndHighSt,
        topSt,
    };
};

module.exports = getBasedOnRecentPicks;
