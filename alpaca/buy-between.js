const lookup = require('../utils/lookup');
const alpacaLimitBuy = require('./limit-buy');


module.exports = async (ticker, minPrice, maxPrice, dollarsToBuy) => {
    
    minPrice = Number(minPrice);
    maxPrice = Number(maxPrice);
    dollarsToBuy = Number(dollarsToBuy);

    if (minPrice > maxPrice) {
        [minPrice, maxPrice] = [maxPrice, minPrice];
        console.log('flipped');
    }

    log({
        ticker,
        minPrice,
        maxPrice,
        dollarsToBuy
    })

    const { currentPrice } = await lookup(ticker);
    const totalQuantity = Math.min(dollarsToBuy / currentPrice);
    const shareBreakdown = {
        96: 20,
        87: 10,
        60: 10,
        40: 20,
        24: 15,
        10: 15,
        3: 10
    };

    const getPercentOf = (number, percent) => number * percent / 100;
    const getPercentile = (() => {
        const distance = maxPrice - minPrice;
        return percentile => {
            const aboveMin = getPercentOf(distance, percentile);
            str({ aboveMin})
            return minPrice + aboveMin;
        };
    })();

    const purchases = Object.keys(shareBreakdown)
        .map(pricePercentile => ({
            pricePercentile: Number(pricePercentile),
            sharesPercentile: shareBreakdown[pricePercentile]
        }))
        .map(({ pricePercentile, sharesPercentile }) => ({
            limitPrice: getPercentile(pricePercentile).twoDec(),
            quantity: Math.round(
                getPercentOf(totalQuantity, sharesPercentile)
            ),
        }))
        .reverse();

    str({
        purchases
    });

    await log([
        'buy between: ',
        `${ticker} $${dollarsToBuy} between ${minPrice} and ${maxPrice} -- `,
        purchases.map(({ limitPrice, quantity }) => `${quantity} @ ${limitPrice}`).join(' | ')
    ].join(' '));

    for (let { limitPrice, quantity } of purchases) {
        alpacaLimitBuy({
            ticker,
            limitPrice,
            quantity,
            timeoutSeconds: 60 * 60 * 2.5,
            fallbackToMarket: false
        });
    }

};