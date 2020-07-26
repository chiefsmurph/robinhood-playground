const NUM_DAYS_TO_LOAD = 60;

const START_MIN = -210;//51;    // 3am
const STOP_MIN = 811;
const TIMEOUT_SECONDS = 15;

const BalanceReport = require('../models/BalanceReport');

const stratManager = require('./strat-manager');
const regCronIncAfterSixThirty = require('../utils/reg-cron-after-630');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');

const dayInProgress = require('../realtime/day-in-progress');
const getBalanceReport = require('./get-balance-report');

// inner
let timeout;
let isRunning;
let allBalanceReports = [];
let onReport;

const { RSI } = require('technicalindicators');


let prevRSI;
const getBalanceRSI = () => {
    const rsiSeries = RSI.calculate({
        values: allBalanceReports.map(report => report.alpacaBalance),
        period: 50
    }) || [];
    return rsiSeries.pop();
};

const init = async (onReportFn) => {
    onReport = onReportFn;
    let foundReports = await BalanceReport.find().lean();

    const getReportDate = r => (new Date(r.time)).toLocaleDateString();

    const uniqDates = foundReports.map(getReportDate).uniq();
    const startAtDate = uniqDates[uniqDates.length - Math.min(uniqDates.length, NUM_DAYS_TO_LOAD)];
    foundReports = foundReports.slice(
        foundReports.findIndex(
            r => getReportDate(r) === startAtDate
        )
    );

    // console.log('init balance reports', Object.keys(stratManager));
    console.log('foundReports', foundReports.length);
    allBalanceReports = foundReports;
    prevRSI = getBalanceRSI();
    await log(`current balance RSI - ${prevRSI}`);
    regCronIncAfterSixThirty({
        name: 'start balance report manager',
        run: [START_MIN],
        fn: start
    });
    regCronIncAfterSixThirty({
        name: 'stop balance report manager',
        run: [STOP_MIN],
        fn: stop
    });

    // if between start and end times then start() on init
    const min = getMinutesFromOpen();
    console.log({ currentMin: min });
    if (dayInProgress(START_MIN, STOP_MIN)) {
        console.log('starting because day in progress');
        await start();
    } else {
        console.log('not starting because outside of balance report times');
    }

    return allBalanceReports;
};

const start = async () => {
    if (!dayInProgress(START_MIN - 1, STOP_MIN)) {
        return console.log('not starting because day is not in progress.  market closed today?');
    }
    if (isRunning) {
        return console.log('balance report manager already running');
    }
    console.log('starting balance report manager');
    isRunning = true;
    return runAndSetTimeout();
};

const runAndSetTimeout = async () => {
    console.log('runAndSetTimeout', { isRunning });
    if (!isRunning) return;
    const min = getMinutesFromOpen();
    const shortTimeout = min > -30 && min < 390;
    await getAndSaveBalanceReport();
    const toSeconds = shortTimeout ? TIMEOUT_SECONDS : TIMEOUT_SECONDS * 12;
    timeout = setTimeout(runAndSetTimeout, toSeconds * 1000);
};

const getAndSaveBalanceReport = async () => {

    const min = getMinutesFromOpen();
    const isRegularHours = min > 0 && min < 390;

    // console.log('hereee');
    try {
        const { report, additionalAccountInfo } = await getBalanceReport(isRegularHours);
        if (report.alpacaBalance === null) return log('still initializing positions, skipping report');
        const mongoDoc = await BalanceReport.create(report);
        // console.log(
        //     'mongodb',
        //     mongoDoc
        // );
        allBalanceReports.push(mongoDoc);
        const newRSI = getBalanceRSI();
        const rsiBreaks = [50, 60, 70, 80, 90];
        const hitBreak = rsiBreaks.find(num => prevRSI < num && newRSI >= num);
        if (hitBreak) {
            await log(`hit BALANCE RSI break - ${hitBreak}`);
        }
        prevRSI = newRSI;
        onReport(mongoDoc, additionalAccountInfo);
    } catch (e) {
        console.error(e);
    }
};

const getAllBalanceReports = () => allBalanceReports;

const stop = () => {
    console.log('stopping balance reports')
    isRunning = false;
    clearTimeout(timeout);
    timeout = null;
};

module.exports = {
    init,
    start,
    stop,
    getAllBalanceReports,
    getAndSaveBalanceReport
};