
const sendEmail = require('../utils/send-email');
const { emails } = require('../config');

const lastNotifications = {};
const WAIT_MIN_BETWEEN = 33;

const dayInProgress = require('../realtime/day-in-progress');

const notifyHugeDown = async ({ ticker, zScoreSum, zScoreFinal, buyMult }) => {
  if (!dayInProgress(-30, 430)) {
    console.log('no need');
    return;
  }
  const lastNotif = lastNotifications[ticker];
  if (lastNotif > Date.now() - (1000 * 60 * WAIT_MIN_BETWEEN)) {
    return;
  }
  await sendEmail('force', `hugeDown ${ticker}`, `zScoreSum ${zScoreSum} | zScoreFinal ${zScoreFinal} | buyMult ${buyMult}`, Object.keys(emails)[1]); // cell phone
  lastNotifications[ticker] = handler;
};


export default notifyHugeDown;