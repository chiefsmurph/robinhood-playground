const { alpaca: { keyId }, tiingo: { token } } = require('../config');
const { isTradeable } = require('../utils/filter-by-tradeable.js');
const request = require('request-promise');

const { polygonClient, restClient, websocketClient } = require("polygon.io");
const rest = restClient(keyId);
const chunkApi = require('../utils/chunk-api');
const lookupMultiple = require('../utils/lookup-multiple');
const { alpaca } = require('../alpaca');
const getTickersOfInterest = require('./get-tickers-of-interest');

const { mapObject } = require('underscore');

module.exports = async (ticker = 'AAPL') => {


  console.log(
    await rest.stocks.dailyOpenClose(ticker)
  )
  console.log(
    await rest.stocks.snapshotGainersLosers()
  )


  const allTickers = require('../json/stock-data/allStocks');

  const tradeable = [ticker, ...allTickers.filter(isTradeable).map(t => t.symbol).slice(0, 100)];

  strlog({
    hists:  mapObject(await alpaca.getBars('5Min', tradeable, { after: '2020-08-10'}), hists => hists.map(hist => ({ ...hist, date: (new Date(hist.startEpochTime * 1000)).toLocaleString() })))
  })

  console.log('count tradeable', tradeable.length);
  const iexEverything = await getTickersOfInterest();
  console.log({
    attention: iexEverything,
    count: iexEverything.length
  });


  
  console.time('tiingo')
  let tiingo = await chunkApi(
    tradeable,
    async tickers => JSON.parse(await request(`https://api.tiingo.com/iex/?tickers=${tickers}&token=${token}&afterHours=true`)),
    100
  );

  
  strlog({ tiingo })
  tiingo = tiingo.reduce((acc, { ticker, last } = {}) => ({
    ...acc,
    [ticker]: last
  }), {});
  strlog({
    tiingo,
  });

  console.timeEnd('tiingo')
  console.time('rh')
  const rh = await lookupMultiple(tradeable, true);
  strlog({
    rh,
  })
  console.timeEnd('rh')

  tradeable.forEach(ticker => {
    if (!tiingo[ticker]) {
      console.log('missing tiingo ticker: ', ticker);
    }
    if (!rh[ticker]) {
      console.log('missing rh ticker', ticker);
    }
    if (tiingo[ticker] !== rh[ticker]) {
      console.log('inconsistency', ticker, rh[ticker], tiingo[ticker])
    }
  });

  // strlog({ allTickers });
  // let i = 0;
  // strlog(allTickers.find(t => t.symbol === 'EMMA'))
  // const responses = await mapLimit(
  //   allTickers.filter(isTradeable).slice(0, 100).map(t => t.symbol),
  //   3,
  //   async ticker => {
  //     const response = JSON.parse(await request(`https://api.polygon.io/v1/last/stocks/${ticker}?apiKey=${keyId}`));
  //     i++;
  //     console.log('finished', i);
  //     return {
  //       ticker,
  //       response
  //     }
  //   }
  // );

  //   strlog({ responses})
}