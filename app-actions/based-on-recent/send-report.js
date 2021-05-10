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
    myLargestPositions: {
        description: 'self explanatory',
        formatter: pick => `zScoreSum ${pick.scan.zScoreSum}`
    },
    hundredZScoreSum: {
        description: 'last 100 picks - my own top secret formula',
        formatter: pick => `zScoreSum ${pick.scan.zScoreSum}`
    },
    hundredInverseStTrend: {
        description: 'trended down a lot and high social sentiment score',
        formatter: pick => `${trendAndSt(pick)} = inverseStTrend ${pick.inverseStTrend}`
    },
    hundredReverseInverseStTrend: {
        description: 'trended up a lot and low social sentiment score',
        formatter: pick => `${trendAndSt(pick)} = inverseStTrend ${pick.inverseStTrend}`
    },
    hundredBackwardsStTrend: {
        description: 'last 100 picks - down a lot and low social sentiment score',
        formatter: pick => `${trendAndSt(pick)} = backwardsStTrend ${pick.backwardsStTrend}`
    },

    threeHundredZScoreSum: {
        description: 'last 300 - picks my own top secret formula',
        formatter: pick => `zScoreSum ${pick.scan.zScoreSum}`
    },

    fiveHundredZScoreSum: {
        description: 'last 500 picks - my own top secret formula',
        formatter: pick => `zScoreSum ${pick.scan.zScoreSum}`
    },

    highestZScoreMagic: {
        description: 'last 500 picks - zscore magic',
        formatter: pick => [pick.ticker, pick.scan.zScoreMagic].join(' ')
    },
    fiveHundredInverseStTrend: {
        description: 'last 500 picks - trended down a lot and high social sentiment score',
        formatter: pick => `${trendAndSt(pick)} = inverseStTrend ${pick.inverseStTrend}`
    },
    fiveHundredReverseInverseStTrend: {
        description: 'last 500 picks - trended up a lot and low social sentiment score',
        formatter: pick => `${trendAndSt(pick)} = inverseStTrend ${pick.inverseStTrend}`
    },
    fiveHundredBackwardsStTrend: {
        description: 'last 500 picks - trended down a lot and low social sentiment score',
        formatter: pick => `${trendAndSt(pick)} = backwardsStTrend ${pick.backwardsStTrend}`
    },
    lowestFiveMinuteRSI: {
        description: 'last 500 picks - lowest RSI on the 5 minute',
        formatter: pick => `${pick.ticker} - ${pick.scan.fiveMinuteRSI} RSI`
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
        `Hey everybody!!  It's a new week and you know what that means.  FRESH, NEW, PICKS!  Straight to your inbox.  Changing things up this week with some new strategies and removed some old ones.<br>`,
    ];
    const lines = Object.entries(picks)
        .filter(([_, specificPicks]) => specificPicks.length)
        .reduce((acc, [collection, specificPicks]) => {
            const formatter = formatters[collection];
            if (!formatter) {
                log(`what no formatter for ${collection} what is going on here`);
            }
            return [
                ...acc,
                `<b>${collection}</b>`,
                ...formatter ? [`<i>${formatter.description}</i>`] : [],
                '----------------',
                ...specificPicks.map(pick => `${pick.ticker } @ ${pick.nowPrice} - ${formatter ? formatter.formatter(pick): ''}`),
                '<br>',
            ];
        }, intro);
    lines.push(`<hr><i>And don't forget you can always get the up to the minute action at ${username.split('@').shift()}.com/stocks and then click the word "Picks" in the top blue header and then type "${authStrings[1]}" no quotes all lowercase.</i><br>`);
    lines.push(`<i>Also if you would like to stop receiving these emails just reply with the phrase "I eat water" and you will be promptly removed.</i><br>`);
    const toEmails = onlyMe ? [username] : Object.keys(emails).filter(email => emails[email].includes('recentReport'));
    for (let email of toEmails) {
        await sendEmail('force', `based-on-recent report for ${dateStr}`, lines.join('<br>'), email);   
    }
}