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
            // high = high ST + low trend
            // low = low ST + high trend
            inverseStTrend: Math.round(getSt(recentPick) - (recentPick.trend * 14)),
            // high = low ST + low trend
            backwardsStTrend: Math.round((recentPick.trend * -14) - getSt(recentPick)),
        }))
        .filter(p => p.inverseStTrend && getSt(p))
        .sort((a, b) => b.inverseStTrend - a.inverseStTrend);
};


const getZScorePicks = picks => picks
    .filter(p => p.scan && p.scan.zScoreSum)
    .sort((a, b) => b.scan.zScoreSum - a.scan.zScoreSum)
    .slice(0, 2);

const getBasedOnRecentPicks = async () => {

    const recentHundredPicks = await getReadyToGoWithStWithInverse(
        await getRecentPicks(100, true, false, 'sudden-drops')
    );
    strlog({ recentHundredPicks})


    const hundredZScoreSum = getZScorePicks(recentHundredPicks);
    await log(`hundredZScoreSum: ${hundredZScoreSum.map(pick => [pick.ticker, pick.scan.zScoreSum].join(' - ')).join(' and ')}`);


    const hundredInverseStTrend = recentHundredPicks.slice(0, 2);
    await log(`hundredInverseStTrend: ${hundredInverseStTrend.map(pick => [pick.ticker, getSt(pick), pick.trend, pick.inverseStTrend].join(' - ')).join(' and ')}`);

    const hundredReverseInverseStTrend = [...recentHundredPicks.reverse()].filter(p => p.trend > 0).slice(0, 2);
    await log(`hundredReverseInverseStTrend: ${hundredReverseInverseStTrend.map(pick => [pick.ticker, getSt(pick), pick.trend, pick.inverseStTrend].join(' - ')).join(' and ')}`);

    const hundredBackwardsStTrend = recentHundredPicks.sort((a, b) => b.backwardsStTrend - a.backwardsStTrend).slice(0, 2);
    await log(`hundredBackwardsStTrend: ${hundredBackwardsStTrend.map(pick => [pick.ticker, getSt(pick), pick.trend, pick.backwardsStTrend].join(' - ')).join(' and ')}`);


    const recentThreeHundredPicks = await getRecentPicks(300, true, false, 'sudden-drops');
    strlog({ recentThreeHundredPicks })

    const threeHundredZScoreSum = getZScorePicks(recentThreeHundredPicks);
    await log(`threeHundredZScoreSum: ${threeHundredZScoreSum.map(pick => [pick.ticker, pick.scan.zScoreSum].join(' - ')).join(' and ')}`);


    // ANYTHING DROPPED 20%
    let trendDownBig = recentThreeHundredPicks
        .filter(pick => pick.trend < -20)
        .sort((a, b) => a.trend - b.trend)
        .slice(0, 5);
    await log(`trendDownBig: ${trendDownBig.map(getTicker)}`);
    

    // DAILY RSI BELOW 30
    let rsiOversold = recentThreeHundredPicks
        .sort((a, b) => getRSI(a) - getRSI(b))  // ascending - lowest first
        .filter(pick => getRSI(pick) < 27 && getRSI(pick) > 1)
        .slice(0, 2);
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
        .slice(0, 2);
    await log(`readyToGoAndHighSt: ${readyToGoAndHighSt.map(getTicker)}`);


    const topSt = readyToGoAndHighSt
        .filter(p => {
            const downToday = ['tsh', 'tsc'].some(prop => {
                const { scan = {} } = p;
                const { computed = {} } = scan;
                return computed[prop] < 0;
            });
            return downToday;
        })
        .slice(0, 1);
   topSt.length && await log(`topSt: ${topSt.map(getTicker)} ${getSt(topSt[0])} ${topSt[0].scan.computed.tsh} ${topSt[0].scan.computed.tsc}`);


    const recentFiveHundredPicks = await getReadyToGoWithStWithInverse(
        await getRecentPicks(500, true, false, 'sudden-drops')
    );
    strlog({ recentFiveHundredPicks});

    const fiveHundredZScoreSum = getZScorePicks(recentFiveHundredPicks);
    await log(`fiveHundredZScoreSum: ${fiveHundredZScoreSum.map(pick => [pick.ticker, pick.scan.zScoreSum].join(' - ')).join(' and ')}`);


    const fiveHundredInverseStTrend = recentFiveHundredPicks.slice(0, 2);
    await log(`fiveHundredInverseStTrend: ${fiveHundredInverseStTrend.map(pick => [pick.ticker, getSt(pick), pick.trend, pick.inverseStTrend].join(' - ')).join(' and ')}`);

    const fiveHundredReverseInverseStTrend = [...recentFiveHundredPicks.reverse()].filter(p => p.trend > 0).slice(0, 2);
    await log(`fiveHundredReverseInverseStTrend: ${fiveHundredReverseInverseStTrend.map(pick => [pick.ticker, getSt(pick), pick.trend, pick.inverseStTrend].join(' - ')).join(' and ')}`);
    
    const fiveHundredBackwardsStTrend = recentFiveHundredPicks.sort((a, b) => b.backwardsStTrend - a.backwardsStTrend).slice(0, 2);
    await log(`fiveHundredBackwardsStTrend: ${fiveHundredBackwardsStTrend.map(pick => [pick.ticker, getSt(pick), pick.trend, pick.backwardsStTrend].join(' - ')).join(' and ')}`);

    const lowestFiveMinuteRSI = recentFiveHundredPicks
        .filter(p => (p.scan || {}).fiveMinuteRSI)
        .sort((a, b) => a.scan.fiveMinuteRSI - b.scan.fiveMinuteRSI)
        .slice(0, 2);
    await log(`lowestFiveMinuteRSI: ${lowestFiveMinuteRSI.map(pick => [pick.ticker, pick.scan.fiveMinuteRSI].join(' - ')).join(' and ')}`);

    const highestZScoreMagic = recentFiveHundredPicks
        .filter(p => (p.scan || {}).zScoreMagic)
        .sort((a, b) => b.scan.zScoreMagic - a.scan.zScoreMagic).slice(0, 2);
    await log(`highestZScoreMagic: ${highestZScoreMagic.map(pick => [pick.ticker, pick.scan.zScoreMagic].join(' - ')).join(' and ')}`);

    return {
        hundredZScoreSum,
        // hundredInverseStTrend,
        // hundredReverseInverseStTrend,
        // hundredBackwardsStTrend,
        threeHundredZScoreSum,
        fiveHundredZScoreSum,
        // fiveHundredInverseStTrend,
        // fiveHundredReverseInverseStTrend,
        // fiveHundredBackwardsStTrend,
        lowestFiveMinuteRSI,
        highestZScoreMagic,
        // trendDownBig,
        rsiOversold,
        // readyToGoAndHighSt,
        topSt,
    };
};


// const getBasedOnRecentPicks = async () => {
//     const recentHundredPicks = await getRecentPicks(100, true, true, 'sudden-drops');
//     strlog({ recentHundredPicks})
// };


export default getBasedOnRecentPicks;
