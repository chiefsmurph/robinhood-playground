const tiingoHistoricals = require('../realtime/historicals/tiingo');
const rhHistoricals = require('../realtime/historicals/robinhood');
const { mapObject, pick } = require('underscore');

module.exports = async (ticker = 'AMRH', period = 30) => {
  period = Number(period);

  const obj = {
    tiingoHistoricals: await tiingoHistoricals([ticker], period),
    rhHistoricals: await rhHistoricals([ticker], period)
  };

  const onlyTicker = mapObject(obj, v => v[ticker]);
  const sameInfo = mapObject(
    onlyTicker,
    historicals => historicals.map(hist => ({
      time: (new Date(hist.timestamp)).toLocaleString(),
      ...pick(hist, ['currentPrice', 'close', 'close_price', 'open', 'open_price'])
    }))
  );

  sameInfo.tiingoHistoricals = sameInfo.tiingoHistoricals
    .filter(hist => {
      return sameInfo.rhHistoricals.find(compareHist => compareHist.timestamp === hist.timestamp);
    })
    .map(({ open, close, ...hist }) => ({
      ...hist,
      open_price: open,
      close_price: close
    }));

  const timestampCounts = Object.values(sameInfo).flatten().reduce((acc, { time }) => ({
    ...acc,
    [time]: (acc[time] || 0) + 1
  }), {});

  strlog({ timestampCounts });
  const filtered = mapObject(sameInfo, v => v.filter(hist => timestampCounts[hist.time] === 2))

  console.log(
    filtered.tiingoHistoricals.map(h => h.time).join('\n')
  )

  console.log('\n')
  console.log(
    filtered.tiingoHistoricals.map(h => h.currentPrice).join('\n')
  )

  console.log('\n')
  console.log(
    filtered.rhHistoricals.map(h => h.currentPrice).join('\n'),
  )
  
  return filtered;


};