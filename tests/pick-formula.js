const tiingoHistoricals = require('../realtime/historicals/tiingo');

export default async () => {
  console.log(
    await tiingoHistoricals(
      ['SPY'],
      'daily',
    )
  )
};