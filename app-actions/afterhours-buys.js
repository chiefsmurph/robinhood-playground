const getPositions = require('../alpaca/get-positions');
const limitBuyMultiple = require('./limit-buy-multiple');

module.exports = async (_, dontAct) => {

    let positions = await getPositions();

    await Promise.all(
        positions
            .filter(({ wouldBeDayTrade }) => !wouldBeDayTrade)
            .map(async (position, index) => {
                const { ticker, currentPrice } = position;
                await new Promise(resolve => setTimeout(resolve, 1500 * index));
                await log(`afterhours buy ${ticker}`);
                return limitBuyMultiple({
                  totalAmtToSpend: 20,
                  strategy: 'ahbuys',
                  withPrices: [{
                    ticker,
                    price: currentPrice
                  }]
                })
            })
    );
};