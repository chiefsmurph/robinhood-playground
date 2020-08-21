const { alpaca } = require('../alpaca');
const chunkApi = require('../utils/chunk-api');
const { mapObject } = require('underscore');

const getBars = async (tickers = ['DGLY'], period = '5Min') => {
  const chunks = await chunkApi(
    tickers,
    tickers => alpaca.getBars(period, tickers.split(',')),
    100
  );
  const combined = chunks.reduce((acc, chunk) => ({
    ...acc,
    ...chunk
  }), {});
  strlog({ combined });
  return mapObject(
    combined, 
    hists => hists.map(hist => ({
      ...hist, 
      date: (new Date(hist.startEpochTime * 1000)).toLocaleString() 
    }))
  );
};

module.exports = getBars;