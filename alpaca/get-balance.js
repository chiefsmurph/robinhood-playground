const { alpaca } = require('.');

module.exports = async () => {

  const account = await alpaca.getAccount();
  console.log('Current Account:', account);
  const { equity } = account;

  const offsetByRs = balance => {
      const curRsOffset = require('./strat-manager').getReverseSplitOffset();
      return curRsOffset === null
        ? null
        : balance - curRsOffset;
  };

  return offsetByRs(Number(equity));
};