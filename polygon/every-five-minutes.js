
const getTickersOfInterest = require('./get-tickers-of-interest');
const getBars = require('./get-bars');

module.exports = async () => {
  const tickers = await getTickersOfInterest();
  // const fiveMinBars = await alpaca.getBars('5Min', tickers, { after: '2020-08-10'});

  console.log({ count: tickers.length });
  
  const fiveMinBars = await getBars(tickers);
  // strlog({ fiveMinBars})
  const tickersAndAllPrices = Object.keys(fiveMinBars)
    .filter(ticker => fiveMinBars[ticker] && fiveMinBars[ticker].length && fiveMinBars[ticker][0] && Object.keys(fiveMinBars[ticker][0]).length)
    .map(ticker => {
      const priceKeys = Object.keys(fiveMinBars[ticker][0]).filter(key => key.includes('Price'));
      return {
        ticker,
        allPrices: fiveMinBars[ticker].map(hist => 
          Math.min( 
            ...priceKeys.map(key => hist[key])
          )
        )
      }
    });

  
  // strlog({ tickers, fiveMinBars, tickersAndAllPrices, formcount: tickersAndAllPrices.length })

  return tickersAndAllPrices; 
};