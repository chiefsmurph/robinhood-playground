
const sendEmail = require('../utils/send-email');
const { emails } = require('../config');

const lastNotifications = {};
const WAIT_MIN_BETWEEN = 33;

const dayInProgress = require('../realtime/day-in-progress');
const { registerNewStrategy } = require('./buys-in-progress');
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const cancelAllOrders = require('../alpaca/cancel-all-orders');

const notifyHugeDown = async ({ ticker, zScoreSum, zScoreFinal, buyMult, percentOfBalance, wouldBeDayTrade, isSelling }) => {
  if (!dayInProgress(-30, 430)) {
    console.log('no need');
    return;
  }
  const lastNotif = lastNotifications[ticker];
  if (lastNotif > Date.now() - (1000 * 60 * WAIT_MIN_BETWEEN)) {
    return;
  }
  await sendEmail('force', `hugeDown ${ticker}`, `zScoreSum ${zScoreSum} | zScoreFinal ${zScoreFinal} | buyMult ${buyMult}`, Object.keys(emails)[1]); // cell phone
  lastNotifications[ticker] = Date.now();

  const min = getMinutesFromOpen();
  const shouldBuy = percentOfBalance < 30 || min > 200;
  if (!shouldBuy) return;

  await log(`buying this huge down: ${ticker}`);
  // buy it
  if (wouldBeDayTrade || isSelling) {
    await cancelAllOrders(ticker, 'sell');
  }
  registerNewStrategy(ticker, 'hugeDown');
  const purchaseStocks = require('./purchase-stocks');
  purchaseStocks({
    strategy: 'huge-down',
    multiplier: 140,
    ticker
  });
};


module.exports = notifyHugeDown;