const getPicks = require('./get-picks');
const sendEmail = require('../../utils/send-email');
module.exports = async () => {
    const picks = await getPicks();
    const lines = Object.entries(picks).reduce((acc, [collection, specificPicks]) => [
        ...acc,
        collection,
        '----------------',
        ...specificPicks.map(({ ticker, nowPrice }) => `${ticker } @ ${nowPrice}`),
        '\n',
    ]);

    return sendEmail('force', 'based on recent picks', lines.join('\n'));
}