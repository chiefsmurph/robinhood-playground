// pass in strategies
// return list of days

const mapLimit = require('promise-map-limit');
const detailedNonZero = require('../../app-actions/detailed-non-zero');
const getAssociatedStrategies = require('../../app-actions/get-associated-strategies');

const getTrend = require('../../utils/get-trend');
const { avgArray } = require('../../utils/array-math');
const getStSentiment = require('../../utils/get-stocktwits-sentiment');

const roundTo = numDec => num => Math.round(num * Math.pow(10, numDec)) / Math.pow(10, numDec);
const oneDec = roundTo(1);
const twoDec = roundTo(2);

const Pick = require('../../models/Pick');
const { force: { keep }} = require('../../settings');

export default async () => {

    const nonzero = await detailedNonZero();
    let positions = nonzero.sort((a, b) => Math.abs(b.returnDollars) - Math.abs(a.returnDollars));
    // positions = positions.filter(({ ticker }) => !keep.includes(ticker));
    
    // calculate pickToExecutionPerc of each position
    const withStSent = async position => ({
        ...position,
        stSent: await (async () => {
            const { bullBearScore } = (await getStSentiment(null, position.symbol)) || {};
            console.log(position.symbol, { bullBearScore })
            return bullBearScore;
        })()
    });
    positions = await mapLimit(positions, 1, withStSent);
    positions = await mapLimit(positions, 1, async position => {
        const { buyStrategy, buyDate, average_buy_price, symbol } = position;
        if (!buyStrategy) return position;
        const firstBuyStrategy = Array.isArray(buyStrategy) ? buyStrategy[0] : buyStrategy;
        const split = firstBuyStrategy.split('-');
        const min = split.pop();
        const strategyName = split.join('-');
        if (isNaN(min)) return position;
        const searchData = {
            date: buyDate,
            strategyName,
            min,
        };
        console.log(searchData)
        let foundPick = await Pick.findOne(searchData);
        if (!foundPick) return position;
        foundPick = foundPick.toObject();
        const foundPickObj = foundPick && foundPick.picks ? foundPick.picks.find(pick => pick.ticker === symbol) : null;
        if (!foundPickObj) return position;
        const pickPrice = foundPickObj.price;
        console.log({ pickPrice });
        return {
            ...position,
            ...pickPrice && {
                pickPrice,
                pickToExecutionPerc: getTrend(average_buy_price, pickPrice)
            },
        };
    });

    // aggregate totals
    const formatReturnDollars = returnDollars => returnDollars < 0 ? `-$${Math.abs(returnDollars)}` : `+$${returnDollars}`;
    const totalValue = positions.reduce((acc, { value }) => acc + value, 0);
    const returnAbs = positions.reduce((acc, { returnDollars }) => acc + returnDollars, 0);
    const returnPerc = returnAbs * 100 / totalValue;
    const pickToExecutionPerc = avgArray(
        positions
            .filter(({ pickToExecutionPerc }) => pickToExecutionPerc && Math.abs(pickToExecutionPerc) < 25)
            .map(({ pickToExecutionPerc }) => pickToExecutionPerc)
    );
    console.log({ pickToExecutionPerc });
    
    // format html
    const lines = [
        `Total return: $${twoDec(returnAbs)} (${twoDec(returnPerc)}%)`,
        `Total value: $${twoDec(totalValue)}`,
        `Pick to executation: ${twoDec(pickToExecutionPerc)}%`,
        '-----------------------------------',
        ...positions.map(pos => 
            [
                pos.symbol,
                `    currentReturn: ${formatReturnDollars(twoDec(pos.returnDollars))} (${pos.returnPerc}%) | total value: $${twoDec(pos.value)}`,
                `    buyPrice: $${pos.average_buy_price} | currentPrice: $${pos.lastTrade}`,
                `    buyStrategy: ${pos.buyStrategy} | buyDate: ${pos.buyDate}`,
                ...pos.pickPrice ? [
                    `    pickPrice: ${pos.pickPrice} | pickToExecutionPerc: ${pos.pickToExecutionPerc}%`
                ] : [],
                `    stSent: ${JSON.stringify(pos.stSent)}`
            ].join('\n')
        )
    ];

    const formatted = lines.join('\n');
    
    return {
        formatted,
        positions,
        returnAbs,
        returnPerc,
        pickToExecutionPerc
    };

};


