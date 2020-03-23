const request = require('request-promise');
const { mapObject } = require('underscore');

const { tiingo: { token }} = require('../../config');
const getTrend = require('../../utils/get-trend');
const cacheThis = require('../../utils/cache-this');

const number = n => Number(n);

const getHistoricals = async (ticker, period, daysBack = 7) => {
  daysBack = Number(daysBack)
  console.log({
    ticker,
    period,
    daysBack
  })
  const sevenDaysDate = (new Date());
  sevenDaysDate.setDate(sevenDaysDate.getDate() - daysBack);
  const [month, day, year] = sevenDaysDate.toLocaleDateString().split('/');
  const formatted = [year, month, day].join('-');
  strlog({ formatted })
  const requestOptions = {
    url: `https://api.tiingo.com/iex/${ticker}/prices?startDate=${formatted}&resampleFreq=${period}min&token=${token}&afterHours=true`,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  const response = await request(requestOptions);
  const parsed = JSON.parse(response);
  parsed.reverse();
  const hists = parsed
    .map(({ date, ...hist }) => {
      return {
        date: new Date(date),
        ...mapObject(hist, number)
      };
    });

  const withTrend = hists.map((hist, index) => {
    const prevDay = hists[index + 1];
    const withTSO = {
      ...hist,
      tso: getTrend(hist.open, hist.close)
    };
    if (!prevDay) return withTSO;
    return {
      ...withTSO,
      tsc: getTrend(prevDay.close, hist.close)
    };
  });

  const allVols = withTrend.map(hist => hist.volume).filter(Boolean);
  const maxVol = Math.max(...allVols);
  const minVol = Math.min(...allVols);
  // console.log({ maxVol, minVol });
  const spread = maxVol - minVol;
  const withVolumePerc = withTrend.map(hist => {
    const { volume } = hist;
    const volMinusMin = volume - minVol;
    return {
      ...hist,
      volumeRatio: volMinusMin / spread * 100,
      currentPrice: hist.close
    };
  });

  const withTimestamp = withVolumePerc
    .map(hist => ({
      ...hist,
      timestamp: new Date(hist.date).getTime() + (1000 * 60 * period)
    }))
    .filter(hist => hist.timestamp < Date.now());

  console.log(`got historicals for ${ticker}`, withTimestamp.length);
  return withTimestamp.reverse();

};

module.exports = async (tickers, period, daysBack) => {
  // console.log({ tickers })

  if (typeof tickers === 'string') tickers = [tickers];
  period = Number(period);

  console.log(`tiingo historicals for ${tickers.length} tickers...`);
  console.log({ tickers, period, daysBack })

  const asArray = await mapLimit(tickers, 10, async ticker => ({
    ticker,
    historicals: await getHistoricals(ticker, period, daysBack).catch(console.error)
  }));

  return asArray.reduce((acc, { ticker, historicals }) => ({
    ...acc,
    ...ticker && historicals && { [ticker]: historicals }
  }), {});

}