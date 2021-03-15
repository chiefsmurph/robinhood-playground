const getPicks = require('./get-picks');
const sendEmail = require('../../utils/send-email');
const { get } = require('underscore');

const { gmail: { username }, emails, authStrings } = require('../../config');

const getSt = pick => (
    get(pick.scan, 'stSent', 0) ||
    get(pick.stSent, 'bullBearScore', 0)
);
const getRSI = pick => get(pick.scan, 'computed.dailyRSI', 100);
const trendAndSt = pick => `trend ${pick.trend}% stSent ${getSt(pick)}`;
const formatters = {
    hundredInverseStTrend: {
        description: 'last 100 picks - trended down a lot and high social sentiment score',
        formatter: pick => `${trendAndSt(pick)} = inverseStTrend ${pick.inverseStTrend}`
    },
    fiveHundredInverseStTrend: {
        description: 'last 500 picks - trended down a lot and high social sentiment score',
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
        description: 'trend < 15% and stSent > 300',
        formatter: trendAndSt
    },
    topSt: {
        description: 'the highest social sentiment score under 15% trend',
        formatter: trendAndSt
    }
};


module.exports = async (onlyMe = true) => {

    const dateStr = (new Date()).toLocaleDateString().split('/').join('-');
    const picks = await getPicks();
    const intro = [
        `Congrats!  You made a wise choice to join rh-playground's based-on-recent report!  These are the recommendations going into today.<br>`,
    ];
    const lines = Object.entries(picks)
        .filter(([_, specificPicks]) => specificPicks.length)
        .reduce((acc, [collection, specificPicks]) => [
            ...acc,
            `<b>${collection}</b>`,
            `<i>${formatters[collection].description}</i>`,
            '----------------',
            ...specificPicks.map(pick => `${pick.ticker } @ ${pick.nowPrice} - ${formatters[collection].formatter(pick)}`),
            '<br>',
        ], intro);
    lines.push(`<hr><i>And don't forget you can always get the up to the minute action at ${username.split('@').shift()}.com/stocks and then click the word "Picks" in the top blue header and then type "${authStrings[1]}" no quotes all lowercase.</i><br>`);
    lines.push(`<i>Also if you would like to stop receiving these emails just reply with the phrase "I eat water" and you will be promptly removed.</i><br>`);
    const toEmails = onlyMe ? [username] : Object.keys(emails).filter(email => emails[email].includes('recentReport'));
    for (let email of toEmails) {
        await sendEmail('force', `based-on-recent report for ${dateStr}`, lines.join('<br>'), email);   
    }
}