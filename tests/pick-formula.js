const tiingoHistoricals = require('../realtime/historicals/tiingo');

module.exports = async () => {
  console.log(
    await tiingoHistoricals(
      ['SPY'],
      'daily',
    )
  )
};