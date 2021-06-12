const lookup = require('./lookup');
const cacheThis = require('./cache-this');
const getTrend = require('./get-trend');
const { avgArray, percUp } = require('./array-math');
const { mapObject } = require('underscore');
const getHistoricals = require('../realtime/historicals/get');
const {
  getDailyHistoricals,
  addDailyHistoricals,
  addDailyRSI
} = require('../realtime/historicals/add-daily-historicals');

const cachedLookup = cacheThis(lookup, 10);

const NUMS = [
  10,
  15,
  20,
  30,
  40
];

export default cacheThis(async ticker => {

  // daily rsi
  const [{
    computed: {
      dailyRSI
    }
  }] = addDailyRSI(
    await addDailyHistoricals([{ ticker }])
  );
  const dRSIkey = (() => {
    if (dailyRSI > 70) return 'gt70';
    if (dailyRSI > 50) return 'gt50';
  })()
  strlog({
    dailyRSI
  })






  // other stuff

  let historicals = await getHistoricals([ticker], 5, undefined, true);
  historicals = historicals[ticker];
  strlog({ historicals });


  const avgDollarVolume = avgArray(
    historicals.map(hist=> 
      hist.close_price * hist.volume,
    )
  );
  
  strlog({ avgDollarVolume });

  const highs = historicals
    .filter(hist => 
      (new Date()).toLocaleDateString() !== new Date(hist.timestamp).toLocaleDateString()
    )
    .map(hist => hist.high_price);
    
  strlog({ highs })
  const avgHigh = avgArray(
    highs
  );

  const {
    currentPrice,
    prevClose,
    bidPrice,
    askPrice
  } = await cachedLookup(ticker);
  strlog({
    askPrice,
    bidPrice
  })
  strlog({
    spread: getTrend(askPrice, bidPrice),
    askPrice,
    bidPrice
  });

  const values = {
    ...mapObject({
      down: prevClose,
      avgh: avgHigh,
    }, val => getTrend(currentPrice, val)),
    spread: getTrend(askPrice, bidPrice),
    avgDollarVolume,
    dailyRSI,
  };

  const withAnalysis = historicals.map((hist, index, arr) => ({
    ...hist,
    isHeadingDown: index <= 9 ? null : (
      hist.close_price <= avgArray(historicals.slice(0, index).slice(-9).map(h => h.close_price))
    )
  })).filter(hist => hist.isHeadingDown !== null );
  strlog({ values })
  let keys = mapObject({
    down: val => NUMS.reverse().find(num => val <= 0 - num),
    avgh: val => NUMS.reverse().find(num => val <= 0 - num),
    straightDown: val => [120, 90, 60, 30].find(toConsider => {
      const ofInterest = withAnalysis.slice(0 - toConsider);
      const percDown = percUp(ofInterest.map(hist => hist.isHeadingDown));
      strlog({ toConsider, percDown })
      return percDown > 70;
    }),
    spread: spread => [1, 2, 3, 4, 5, 6].find(num => {
      strlog({ num, spread})
      return spread < num
    }) || 'gt6',
    avgDollarVolume: dollarVolume => [20000, 10000, 3500].find(num => dollarVolume > num),
    dailyRSI: rsi => {
      const gtVal = [70, 50, 30].find(v => rsi > v);
      return gtVal ? `gt${gtVal}` : 'lt30';
    }
  }, (fn, key) => fn(values[key]));
  

  if (!keys.straightDown) {
    // this is real
    keys.notStrai = 'ghtDowner';
  }

  console.log(keys);

  keys = Object.entries(keys)
    .filter(([key, val]) => val)
    .reduce((acc, [key, val]) => ({ ...acc, [`${key}${val}`]: true }), { })

  
  return {
    values,
    keys
  };
}, 3);