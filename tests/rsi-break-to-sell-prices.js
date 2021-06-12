const mongoose = require('mongoose');
const Log = require('../models/Log');
const getPositions = require('../alpaca/get-positions');

export default async () => {

  console.log( );


  const addLocaleTime = obj => ({
    ...obj,
    localeTime: (new Date(obj.timestamp)).toLocaleString()
  });


  const todayLogs = await Log.getMostRecent();
  const onlyRsiBreaks = todayLogs.filter(log => log.title.includes('an RSI break'));
  const withTickers = onlyRsiBreaks.map(log => ({
    ...log,
    ticker: log.title.split(' ')[0]
  }));

  const positions = await getPositions(true);
  const withTimestamps = positions.map(({ sells = [], ...p }) => ({
    ...p,
    sells: sells
      .map(sell => ({
        ...sell,
        timestamp: new mongoose.Types.ObjectId(sell._id).getTimestamp()
      }))
      .map(addLocaleTime)
  }));

  const withSells = withTickers
    .map(addLocaleTime)
    .map(log => ({
      ...log,
      sells: (
        (
          withTimestamps.find(p => p.ticker === log.ticker) || {}
        )
        .sells || []
      )
        .filter(sell => {
          const [logTime, sellTime] = [log, sell]
            .map(({ timestamp }) => (new Date(timestamp)).getTime());
          

          return sellTime > logTime && sellTime < logTime + 1000 * 60 * 30;  // 5 minutes
        })
    }))

  strlog({
    withTickers,
    withTimestamps,
    withSells
  })

};