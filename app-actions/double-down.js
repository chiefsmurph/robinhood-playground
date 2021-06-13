// buys more of stocks bought today that are already down by minPercDown %
const mapLimit = require('promise-map-limit');
const detailedNonZero = require('./detailed-non-zero');
const simpleBuy = require('./simple-buy');
const sendEmail = require('../utils/send-email');

module.exports = async (minute, minPercDown = 10) => {
    console.log(`${minute} doubling down on stocks bought today and are already down ${minPercDown}%`);
    let nonzero = await detailedNonZero();
    const dateStr = (new Date()).toLocaleDateString().split('/').join('-');
    const onlyBoughtToday = nonzero.filter(({ buyDate }) => buyDate === dateStr);
    const droppedBelowMinPercDown = onlyBoughtToday.filter(({ returnPerc }) => returnPerc <= 0 - minPercDown);
    console.log('num positions', nonzero.length);
    console.log('num bought today', onlyBoughtToday.length);
    console.log('num below minPercDown', droppedBelowMinPercDown.length);
    // console.log(droppedBelowMinPercDown);

    mapLimit(droppedBelowMinPercDown, 3, async position => {
        const doubleDownData = {
            ticker: position.symbol,
            strategy: 'double-down',
            maxPrice: Math.min(150, position.value * 1.2),
            min: minute
        };
        console.log('doubleDownData', doubleDownData);
        try {
            await simpleBuy(doubleDownData);
            await sendEmail(`doubled down on ${position.symbol}`, JSON.stringify(position, null, 2));
        } catch (e) {
            await sendEmail(`failed to double down on ${position.symbol}`, JSON.stringify(position, null, 2));
        }
    });
};