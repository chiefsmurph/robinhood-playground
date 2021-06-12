const allStocks = require('../../json/stock-data/allStocks');
const lookupMultiple = require('../../utils/lookup-multiple');
const { isTradeable } = require('../../utils/filter-by-tradeable');
const getStSent = require('../../utils/get-stocktwits-sentiment');
const getMultipleHistoricals = require('../../app-actions/get-multiple-historicals');

// strategies

const addHistoricals = async (tickers, interval, span) => {

  const keyName = `${span}Historicals`;
  
  // add historical data
  let allHistoricals = await getMultipleHistoricals(
      tickers,
      `interval=${interval}&span=${span}`
  );

  let withHistoricals = tickers
    .map((ticker, i) => ({
        ticker,
        [keyName]: allHistoricals[i]
    }))
    .filter(buy => buy[keyName].length);

  const [first] = withHistoricals;
  const single = first[keyName];
  console.log('count: ', single.length);
  console.log('last: ', (new Date(single[single.length - 1].begins_at).toLocaleString()));
  

  return withHistoricals;
};

const createTickerObj = async tickers => {
  const tickPrices = await lookupMultiple(tickers);
  return Object.keys(tickPrices)
    .reduce((acc, ticker) => ({
      ...acc,
      [ticker]: tickPrices[ticker]
    }), {});
};

export default async (tickers, x, y, includeCurrentPrice = true) => {

  console.log({ tickers: tickers.length, includeCurrentPrice })
  // tickers = tickers || await getTickersBetween(80, Number.POSITIVE_INFINITY);

  const tickerObj = createTickerObj(tickers);
  const withHistoricals = (await addHistoricals(tickers, 'day', 'year'))
    .filter(buy => buy.yearHistoricals && buy.yearHistoricals.length);

  const formattedPrices = withHistoricals.reduce((acc, { ticker, yearHistoricals }) => {
    // strlog({
    //   ticker,
    //   yearHistoricals: yearHistoricals.length
    // })
    const allPrices = yearHistoricals.map(hist => ({
      ...hist,
      currentPrice: hist.close_price
    }));
    if (includeCurrentPrice) {
      allPrices.push({
        currentPrice: tickerObj[ticker]
      });
    }
    return {
      ...acc,
      [ticker]: allPrices
    };
  }, {});

  return formattedPrices;

  // const withGoldenCross = formattedPrices.map(buy => ({
  //   ...buy,
  //   goldenCross: goldenCross(buy)
  // }));

  // // strlog({ withGoldenCross });

  // const goldenCrosses = withGoldenCross
  //   .filter(buy => buy.goldenCross)
  //   .map(buy => buy.ticker);
  
  // strlog({
  //   goldenCrosses
  // });


  // const withStSent = await mapLimit(goldenCrosses, 2, async ticker => ({
  //   ticker,
  //   stSent: (await getStSent(ticker)).bullBearScore
  // }));

  // console.table(withStSent);
};