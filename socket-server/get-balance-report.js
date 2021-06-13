const getAccountBalance = require('../utils/get-account-balance');
const getIndexes = require('../utils/get-indexes');
const getTrend = require('../utils/get-trend');
const { alpaca } = require('../alpaca');
const sendEmail = require('../utils/send-email');

const { disableDayTrades } = require('../settings');
const findDayTrade = require('../tests/find-daytrade');
const getBalance = require('../alpaca/get-balance');

let lastDtCount;

module.exports = async (isRegularHours = true) => {
  let { accountBalance } = await getAccountBalance();
//   if (Math.abs(getTrend(accountBalance, lastBalance)) > 4.9) {
//       console.log('WOAH WOAH', {
//           accountBalance,
//           lastBalance
//       });
//       accountBalance = lastBalance;
//   }

  // lastBalance = accountBalance;
  const account = await alpaca.getAccount();
  const { equity, buying_power, cash, daytrade_count, maintenance_margin, long_market_value } = account;
  const offsetByRs = balance => {
    const curRsOffset = require('./strat-manager').getReverseSplitOffset();
    return curRsOffset === null
      ? null
      : balance - curRsOffset;
  };

  const report = {
      accountBalance,
      indexPrices: await getIndexes(),
      alpacaBalance: offsetByRs(Number(equity)),
      isRegularHours,
  };
  const additionalAccountInfo = {
    cash: +Number(cash).toFixed(2),
    buyingPower: +Number(buying_power).toFixed(2),
    maintenanceMargin: +Number(maintenance_margin).toFixed(2),
    longMarketValue: +Number(long_market_value).toFixed(2),
    daytradeCount: daytrade_count,
  };

  if (lastDtCount !== undefined && daytrade_count && lastDtCount !== daytrade_count) {
    await sendEmail('force', 'DAYTRADE ALERT!', `last: ${lastDtCount} now ${daytrade_count}`);
    await log(`ERROR: DAYTRADE ALERT FROM ${lastDtCount} to ${daytrade_count}`);
    if (lastDtCount < daytrade_count) {
      if (!disableDayTrades) {
        await log('not going to fix anything because day trades are enabled (disableDayTrades false)');
      } else {
        await log('DAYTRADE COUNT INCREMENTED.... GOING TO TRY TO FIX THIS AUTOMATICALLY...');
        findDayTrade();
      }
    } else {
      await log(`no it is not greater than`, {
        lastDtCount,
        daytrade_count
      })
    }
  }
  lastDtCount = daytrade_count;

  strlog({
    report,
    additionalAccountInfo
  });
  return {
    report,
    additionalAccountInfo
  };
};