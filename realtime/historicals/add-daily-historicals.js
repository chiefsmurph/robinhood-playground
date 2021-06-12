
const getMultipleHistoricals = require('../../app-actions/get-multiple-historicals');

const getDailyHistoricals = async tickers => {
  let allHistoricals = await getMultipleHistoricals(
    tickers
    // `interval=day`
  );

  let tickersToHistoricals = tickers.reduce((acc, ticker, index) => ({
    ...acc,
    [ticker]: allHistoricals[index]
  }), {});

  return tickersToHistoricals;

};

const addDailyHistoricals = async trend => {

  const tickers = trend.map(t => t.ticker);
  const tickersToHistoricals = await getDailyHistoricals(tickers);

  return trend.map(buy => ({
    ...buy,
    dailyHistoricals: tickersToHistoricals[buy.ticker]
  }))

};

const { RSI } = require('technicalindicators');
const addDailyRSI = withDailyHistoricals => {

  const getRSI = values => {
      return RSI.calculate({
          values,
          period: 14
      }) || [];
  };

  // strlog({
  //   buys: withDailyHistoricals.map(buy => buy.dailyHistoricals)
  // })
  return withDailyHistoricals.map(buy => ({
    ...buy,
    computed: {
      ...buy.computed,
      dailyRSI: getRSI(
        (buy.dailyHistoricals || []).map(hist => hist.close_price)
      ).pop()
    }
  }));


};

export default {
  getDailyHistoricals,
  addDailyHistoricals,
  addDailyRSI
};