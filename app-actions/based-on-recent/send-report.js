const getPicks = require('./get-picks');
const sendEmail = require('../../utils/send-email');
const { get } = require('underscore');

const getSt = pick => (
    get(pick.scan, 'stSent', 0) ||
    get(pick.stSent, 'bullBearScore', 0)
);
const getRSI = pick => get(pick.scan, 'computed.dailyRSI', 100);
const trendAndSt = pick => `trend ${pick.trend}% stSent ${getSt(pick)}`;
const formatters = {
    hundredInverseStTrend: {
        description: 'trended down a lot and high social sentiment score',
        formatter: pick => `${trendAndSt(pick)} = inverseStTrend ${pick.inverseStTrend}`
    },
    trendDownBig: {
        description: 'trended down 20% or more from where it was recommended',
        formatter: pick => `trend ${pick.trend}%`
    },
    rsiOversold: {
        description: 'below 30 rsi on the daily',
        formatter: pick => `dailyRSI ${getRSI(pick)} trend ${pick.trend}%`
    },
    readyToGoAndHighSt: {
        description: 'trend < 15% and high social sentiment score',
        formatter: trendAndSt
    },
    topSt: {
        description: 'the highest social sentiment score under 15% trend',
        formatter: trendAndSt
    }
};


module.exports = async () => {
    const picks = await getPicks();
    const lines = Object.entries(picks).reduce((acc, [collection, specificPicks]) => [
        ...acc,
        `<b>${collection}</b>`,
        `<i>${formatters[collection].description}</i>`,
        '----------------',
        ...specificPicks.map(pick => `${pick.ticker } @ ${pick.nowPrice} - ${formatters[collection].formatter(pick)}`),
        '<br>',
    ], []);

    return sendEmail('force', 'based on recent picks', lines.join('<br>'));
}