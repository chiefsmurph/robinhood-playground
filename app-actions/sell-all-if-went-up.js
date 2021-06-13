const detailedNonZero = require('./detailed-non-zero');
const activeSell = require('./active-sell');

const MIN_PERC_UP = 6; // sell if stock rose 18% since yesterdays close
const MIN_PERC_DOWN = 6;

module.exports = async Robinhood => {
    const nonzero = await detailedNonZero();
    // console.log(nonzero);
    const goneUp = nonzero.filter(pos => {
        if (!pos) return false;
        const { average_buy_price, prevClose, currentPrice } = pos;
        return [
            average_buy_price,
            prevClose
        ].some(price => {
            return (
                currentPrice > price * (100 + MIN_PERC_UP) / 100
            ) || (
                currentPrice < price * (100 - MIN_PERC_DOWN) / 100
            );
        });
    });
    // console.log(nonzero.length, 'total', goneUp.length, 'gone up');
    for (let pos of goneUp) {
        try {
            const response = await activeSell(
                {
                    ticker: pos.symbol,
                    quantity: Math.ceil(pos.quantity / 2)
                }
            );
            console.log('sold because gone up', response);
        } catch (e) {
            console.log('error selling because gone up', pos.symbol, e);
        }
    }

};
