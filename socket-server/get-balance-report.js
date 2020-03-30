const getAccountBalance = require('../utils/get-account-balance');
const alpacaBalance = require('../alpaca/get-balance');
const getIndexes = require('../utils/get-indexes');
const getTrend = require('../utils/get-trend');
const { alpaca } = require('../alpaca');
const sendEmail = require('../utils/send-email');

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
  const { equity, buying_power, daytrade_count } = account;
  
  // lastBalance = accountBalance;
  const report = {
      accountBalance,
      indexPrices: await getIndexes(),
      alpacaBalance: Number(equity),
      isRegularHours,
  };
  const additionalAccountInfo = {
    buyingPower: +Number(buying_power).toFixed(2),
    daytradeCount: daytrade_count,
  };

  if (lastDtCount && daytrade_count && lastDtCount !== daytrade_count) {
    await sendEmail('force', 'DAYTRADE ALERT!', `last: ${lastDtCount} now ${daytrade_count}`);
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