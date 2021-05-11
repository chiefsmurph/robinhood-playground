
const sendEmail = require('../utils/send-email');
const { emails } = require('../config');
const { throttle } = require('underscore');

const lastNotifications = {};
const WAIT_MIN_BETWEEN = 45;

const dayInProgress = require('../realtime/day-in-progress');

const notifyBig = ({ ticker, zScoreFinal }) => {
  if (!dayInProgress(-30, 430)) {
    console.log('no need');
  }
  const handler = lastNotifications[ticker] || throttle(async () => {
    await sendEmail('force', `notify-big ${ticker}`, `important notification ${zScoreFinal}`, Object.keys(emails)[1]); // cell phone
  }, WAIT_MIN_BETWEEN * 1000 * 60);
  lastNotifications[ticker] = handler;
  return handler();
};


module.exports = notifyBig;