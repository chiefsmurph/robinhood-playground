const getAssociatedStrategies = require('./get-associated-strategies');
const getFilesSortedByDate = require('../utils/get-files-sorted-by-date');
const getTrend = require('../utils/get-trend');


// utils
const daysBetween = (firstDate, secondDate) => {
    var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    var diffDays = Math.round(Math.abs((firstDate.getTime() - secondDate.getTime()) / (oneDay)));
    return diffDays;
};

const addBuyDateToPositions = async nonzero => {
    console.log('adding buy to positions', nonzero.map(pos => pos.ticker));
    // shared var
    const dailyTransactionDates = await getFilesSortedByDate('daily-transactions');
    
    // calc totalValue & return in percentage and absolutely $ amt
    const withReturn = nonzero
        .map(pos => ({
            ...pos,
            symbol: pos.ticker,
            returnPerc: getTrend(pos.afterHoursPrice || pos.lastTrade, pos.average_buy_price),
        }))
        .map(pos => ({
            ...pos,
            returnDollars: +(pos.returnPerc / 100 * pos.quantity * pos.lastTrade).toFixed(2),
            value: pos.lastTrade * pos.quantity,
        }));

    // include buyStrategy, buyDate (from daily-transactions)
    const associatedBuys = await getAssociatedStrategies({
        tickers: withReturn.map(pos => pos.ticker),
    }, dailyTransactionDates);

    // console.log({associatedBuys})

    const withBuys = withReturn.map(pos => {
        const relatedBuys = associatedBuys.filter(obj => obj.ticker === pos.ticker);
        const [firstBuy] = relatedBuys;
        return {
            ...pos,
            ...(firstBuy && {
                buyStrategy: relatedBuys.length > 1 ? relatedBuys.map(buy => buy.strategy) : firstBuy.strategy,
                buyDate: firstBuy.date,
            }),
        };
    });

    // console.log({ withBuys})
    
    
        
    // calc dayAge
    const pmModelDates = await getFilesSortedByDate('prediction-models');
    const calcDayAgeFromPosition = pos => {
        const { buyDate: date, updated_at } = pos;
        if (date) {
            const getIndexFromDateList = dateList => dateList.findIndex(d => d === date);
            const pmIndex = getIndexFromDateList(pmModelDates);
            return pmIndex !== -1 ? pmIndex : getIndexFromDateList(dailyTransactionDates);
        } else {
            return daysBetween(new Date(), new Date(updated_at));
        }
    };

    // withBuys + dayAge =

    let withAge = withBuys.map(pos => ({
        ...pos,
        daysOld: calcDayAgeFromPosition(pos)
    }));

    return withAge;
};

module.exports = addBuyDateToPositions;