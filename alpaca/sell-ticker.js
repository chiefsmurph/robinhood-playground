const { alpaca } = require('.');
const { force: { keep }} = require('../settings');

const howMuchBoughtToday = require('./how-much-bought-today');
const alreadyBoughtToday = require('../rh-actions/already-bought-today');

export default async (_, ticker, dontSell) => {
    const boughtToday = await howMuchBoughtToday(_, ticker) || 0;
    if (boughtToday > 0) {
        throw 'already bought today: ' + ticker;
    }

    if (await alreadyBoughtToday(_, ticker)) {
        throw 'not selling ' + ticker + 'because bought today'};
    }

    const positions = await alpaca.getPositions();
    // console.log({ positions })
    const pos = positions.find(pos => pos.symbol === ticker);
    if (!pos) {
        return console.log('no position with that ticker: ', ticker);
    }
    console.log({ pos }, 'selling ticker');
    if (dontSell) return;
    const order = await alpaca.createOrder({
        symbol: pos.symbol, // any valid ticker symbol
        qty: Number(pos.qty),
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
    });
    console.log(order)
};