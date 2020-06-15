const getAccountBalance = require('../utils/get-account-balance');
const alpacaBalance = require('../alpaca/get-balance');
const getIndexes = require('../utils/get-indexes');
const getTrend = require('../utils/get-trend');
const { alpaca } = require('../alpaca');
const sendEmail = require('../utils/send-email');
const { onlyUseCash } = require('../settings');

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

  const account = await alpaca.getAccount();
  console.log('Current Account:', account);
  const { equity, buying_power, cash, daytrade_count, maintenance_margin } = account;

  const offsetByRs = balance => {
      const curRsOffset = require('./strat-manager').getReverseSplitOffset();
      return curRsOffset === null
        ? null
        : balance - curRsOffset;
  };

  // lastBalance = accountBalance;
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
    daytradeCount: daytrade_count,
  };

  if (lastDtCount && daytrade_count && lastDtCount !== daytrade_count) {
    await sendEmail('force', 'DAYTRADE ALERT!', `last: ${lastDtCount} now ${daytrade_count}`);
    await log(`ERROR: DAYTRADE ALERT FROM ${lastDtCount} to ${daytrade_count}`);
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