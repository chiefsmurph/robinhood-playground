const Pick = require('../models/Pick');
const getHistoricals = require('../realtime/historicals/get');
const getTrend = require('../utils/get-trend');
const tiingoHistoricals = require('../realtime/historicals/tiingo');
const { partition } = require('underscore');
const { sumArray } = require('../utils/array-math');

module.exports = async () => {


  const { SPY: thirtyHistoricals } = await tiingoHistoricals(['SPY'], 30, 360);

  const getClosestPrice = date => thirtyHistoricals.map(hist => ({
    ...hist,
    msDiff: Math.abs((new Date(hist.date)).getTime() - date.getTime())
  })).sort((a, b) => a.msDiff - b.msDiff)[0];


  // strlog({ thirtyHistoricals});

  let response = await getHistoricals(['SPY', 'VIIX'], 'd', 'year');
  strlog({ response })
  const { SPY: dailySpy, VIIX: dailyVix }  = response;
  const combined = dailySpy.map((hist, index, arr) => ({
    ...hist,
    date: (new Date(new Date(hist.begins_at).getTime() + 1000 * 60 * 60 * 24)).toLocaleDateString(),
    spyOvernight: getTrend(hist.open_price, (arr[index-1] || {}).close_price),
    spyTrend: hist.trend,
    spyDistance: getTrend(hist.high_price, hist.low_price),
    vixOvernight: getTrend(dailyVix[index].open_price, (dailyVix[index-1] || {}).close_price)
  }));

  const getDaily = date => combined.find(o => o.date === date);

  strlog({ combined});
  const getPicksForDate = date => 
    Pick.find(
      { 
        date,
        strategyName: /.*sudden.*drops.*(medium|major).*/i
      },
      { data: 0 }
    ).lean();

  const allDates = await Pick.getUniqueDates();
  strlog({ allDates })
  const byDate = await mapLimit(
    allDates,
    3,
    async date => {
      const picks = await getPicksForDate(date);
      console.log(`done with ${date}`);
      return {
        date,
        picks
      };
    }
  );

  const periods = {
    initial: 0,
    brunch: 45,
    lunch: 120,
    dinner: 200,
    eod: 390
  };
  return byDate.map(({ date, picks }, index) => {


    const prevIndex = index - 1;
    const prevDate = (byDate[prevIndex] || {}).date;
    const {
      spyTrend: prevSpyTrend,
      spyDistance: prevSpyDistance,
    } = combined.find(o => o.date === prevDate) || {};
    strlog({
      prevIndex,
      prevDate,
      prevSpyTrend,
      prevSpyDistance
    })
    const createChunk = obj => ({
      date,
      ...obj,
      prevSpyTrend,
      prevSpyDistance
    });


    const getChunk = period => {

      if (period === 'eod') {
        return {
          date,
          closePrice: getDaily(date).close_price
        };
      }

      const numPicks = picks.filter(pick => pick.strategyName.includes(period)).map(pick => pick.strategyName).length;
      const openSPY = period === 'initial'
        ? getDaily(date).open_price
        : (() => {

          let d = new Date(date);
          d.setHours(6);
          d.setMinutes(30);
          d = new Date(
            d.getTime() + 1000 * 60 * periods[period]
          );
          // d.setSeconds(0);
          console.log(d.toLocaleString(), 'date', date, period);
          return getClosestPrice(d).open;

        })();

      return createChunk({
        period,
        numPicks,
        openSPY,
      });
    };



    const today = Object.keys(periods).map(getChunk);

    // strlog({ today });
    const [middleChunks, rest] = partition(today, chunk => ['brunch', 'lunch'].includes(chunk.period));
    // strlog({
    //   middleChunks,
    //   rest
    // })
    const combinedMiddle = createChunk({
      period: 'middle',
      numPicks: sumArray(middleChunks.map(chunk => chunk.numPicks)),
      openSPY: middleChunks[0].openSPY
    });
    rest.splice(1, 0, combinedMiddle);
    return rest;


  }).flatten();


}