// calculates days and loads strat-perfs into stratObj
const fs = require('mz/fs');
const jsonMgr = require('../../utils/json-mgr');
const { avgArray } = require('../../utils/array-math');
const StratPerf = require('../../models/StratPerf');

module.exports = async (daysBack, skipDays = 0) => {

    console.log('initing strat-perfs')

    let dates = await StratPerf.getUniqueDates();
    let datesOfInterest = dates.slice(0, dates.length - skipDays);
    console.log({ datesOfInterest, skipDays})
    datesOfInterest = datesOfInterest.slice(0 - daysBack);
    console.log('selected days', { datesOfInterest, dates, daysBack, skipDays });

    const stratObj = {};
    for (let date of datesOfInterest) {
        const dayStrats = await StratPerf.getByDate(date);
        stratObj[date] = dayStrats;
    }

    console.log('loaded strats into memory');

    return {
        days: datesOfInterest,
        stratObj
    };

};
