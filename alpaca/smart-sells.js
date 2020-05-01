const { alpaca } = require('.');
const { force: { keep }, continueDownForDays } = require('../settings');
const shouldYouSellThisStock = require('../analysis/should-you-sell-this-stock');
// const shouldSellPosition = require('../utils/should-sell-position');
const getStSent = require('../utils/get-stocktwits-sentiment');
const sellPosition = require('./sell-position');
const getPositions = require('./get-positions');

module.exports = async (dontSell) => {

    console.log({ dontSell })
    let positions = await getPositions();
    
    // positions = await mapLimit(positions, 3, async pos => ({
    //     ...pos,
    //     stSent: (await getStSent(pos.ticker) || {}).bullBearScore || 0
    // }));

    // positions = positions.map(pos => ({
    //     ...pos,
    //     shouldSell: shouldSellPosition(pos)
    // }));

    positions = positions.filter(pos => !keep.includes(pos.symbol));
    positions = positions.filter(pos => !pos.wouldBeDayTrade && pos.daysOld > continueDownForDays + 1);

    // str({ positions })
    const withShouldSells = await mapLimit(positions, 3, async pos => ({
        ...pos,
        shouldSell: await shouldYouSellThisStock(pos.ticker, pos.avgEntry)
    }));

    console.log('selling' + withShouldSells.map(p => p.ticker));

    str({ withShouldSells })

    const toSell = withShouldSells.filter(pos => pos.shouldSell);
    console.log('len', toSell)
    strlog({
        toSell: toSell.map(pos => pos.ticker)
    })
    if (dontSell) {
        console.log('dont sell alpaca....returning!')
        return;
    };
    await mapLimit(toSell, 3, async ({ ticker, qty }) => {
        return sellPosition({
            ticker,
            quantity: qty
        })
    });

    // console.log('done selling, sending refresh positions to strat manager');
    // stratManager.refreshPositions()
};