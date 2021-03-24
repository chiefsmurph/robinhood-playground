const { alpaca } = require('../../alpaca');
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
    },
    myLargestPositions: {
        description: 'pretty self explanatory',
        formatter: pick => `my current unrealizedPl: ${pick.returnPerc}%`
    }
};

const getMyLargestPositions = async () => {
    const positions = await alpaca.getPositions();
    const sorted = positions.sort((a, b) => Number(b.market_value) - Number(a.market_value));
    strlog(sorted);
    return sorted.slice(0, 3).map(p => ({
        ticker: p.symbol,
        returnPerc: (Number(p.unrealized_plpc) * 100).twoDec(),
        nowPrice: Number(p.current_price)
    }));
};

module.exports = async (onlyMe = true) => {
    const dateStr = (new Date()).toLocaleDateString().split('/').join('-');

    const picks = {
        myLargestPositions: await getMyLargestPositions(),
        ...await getPicks()
    };

    const intro = [
        `Hope you're having a great day.  Here's the current stocks that have dropped a whole lot and might be good to buy and hold.<br>`,
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