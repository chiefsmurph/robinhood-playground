const getPicks = require('./get-picks');
const sendEmail = require('../../utils/send-email');
const { get } = require('underscore');

const getRSI = pick => get(pick.scan, 'computed.dailyRSI', 100);
const formatters = {
    hundredInverseStTrend: {
        description: 'trended down a lot and high social sentiment score',
        formatter: pick => `stSent ${pick.scan.stSent} - (trend ${pick.trend} * 14) = ${pick.inverseStTrend}`
    },
    trendDownBig: {
        description: 'trended down 20% or more from where it was recommended',
        formatter: pick => `trended ${pick.trend}%`
    },
    rsiOversold: {
        description: 'below 30 rsi on the daily',
        formatter: pick => `dailyRSI ${getRSI(pick)}`
    },
    readyToGoAndHighSt: {
        description: 'anything with a trend < 15% and high social sentiment score',
        formatter: pick => `trend ${pick.trend} stSent ${pick.scan.stSent}`
    },
    topSt: {
        description: 'the highest social sentiment score under 15% trend',
        formatter: pick => `trend ${pick.trend} stSent ${pick.scan.stSent}`
    }
};


module.exports = async () => {
    const picks = await getPicks();
    const lines = Object.entries(picks).reduce((acc, [collection, specificPicks]) => [
        ...acc,
        collection,
        `<i>${formatters[collection].description}</i>`,
        '----------------',
        ...specificPicks.map(pick => `${pick.ticker } @ ${pick.nowPrice} - ${formatters[collection].formatter(pick)}`),
        '\n',
    ], []);

    return sendEmail('force', 'based on recent picks', lines.join('\n'));
}