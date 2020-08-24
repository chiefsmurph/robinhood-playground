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

    const toSell = positions.filter(pos => 
      !pos.wouldBeDayTrade
      && pos.returnPerc > 2
    );

    console.log('len', toSell)
    strlog({
        toSell: toSell.map(pos => pos.ticker)
    });

    if (dontSell) {
        console.log('dont sell premarket....returning!')
        return;
    };

    toSell.forEach(async pos => {
      const percToSell = Math.round(3 + pos.returnPerc);
      await log(`premarket sell ${pos.ticker} - ${percToSell}% bc returnPerc ${pos.returnPerc}`);
      sellPosition({
          ...pos,
          percToSell
      });
    });

    // console.log('done selling, sending refresh positions to strat manager');
    // stratManager.refreshPositions()
};