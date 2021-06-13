// gets current strategy performance of picks TODAY

const fs = require('mz/fs');
const login = require('../rh-actions/login');
const { analyzeDay } = require('../app-actions/record-strat-perfs');
const Pick = require('../models/Pick');

module.exports = async () => {
    let sortedDates = await Pick.getUniqueDates();

    console.log(sortedDates);

    let todayReport = await analyzeDay(sortedDates[sortedDates.length - 1]);
    todayReport = todayReport.filter(strat => !strat.strategyName.includes('-first3') && !strat.strategyName.includes('-single') );
    // console.log(JSON.stringify(todayReport, null, 2));
    return todayReport;
};
