const getHistoricals = require('../realtime/historicals/get');
const getTrend = require('./get-trend');
const { avgArray } = require('./array-math');
const lookup = require('./lookup');
const getBalance = require('../alpaca/get-balance');
const { alpaca } = require('../alpaca');
// const { continueDownForDays } = require('../settings');

module.exports = async (forceAvgDistance, forceTrendSincePrevClose) => {
  let { SPY: spyHistoricals } = await getHistoricals(['SPY'], 'd', 'year', false);
  const [{
    open_price,
    close_price,
    low_price,
    high_price,
    begins_at
  }] = spyHistoricals.reverse();
  const distances = {
    distance: getTrend(close_price, open_price),
    trend: getTrend(high_price, low_price),
  };
  const avgDistance = forceAvgDistance || avgArray(
    Object.values(distances).map(Math.abs)
  );
  const quote = await lookup('SPY');
  const  { afterHoursPrice, currentPrice } = quote;
  const trendSincePrevClose = forceTrendSincePrevClose || getTrend(currentPrice, close_price);
  console.log({ currentPrice, afterHoursPrice, close_price, trendSincePrevClose})
  const predictedSuddenDrops = Math.round(avgDistance * Math.abs(trendSincePrevClose) * 4.5);
  // strlog({ spyHistoricals: spyHistoricals.reverse(), distances, avgDistance, currentPrice, quote, trendSincePrevClose });



  const AVG_PICK_MULTIPLIER = 28;
  const predictedTotalPicks = Math.max(predictedSuddenDrops * 1.3, 20);
  const predictedMultipliers = (predictedTotalPicks) * AVG_PICK_MULTIPLIER;


  const {
    equity,
    cash
  } = await alpaca.getAccount();
  const targetSpendAmt = Number(equity) / 4;
  // const targetSpendAmt = Number(equity) * 0.5 + Number(cash);
  strlog({ 
    equity,
    cash, 
    targetSpendAmt, 

    begins_at,
    distances,
    avgDistance,
    trendSincePrevClose,

    predictedTotalPicks, 
    predictedMultipliers
  });

  
  let overallMultiplierMultiplier = 1;
  let purchaseAmt = 1;

  if (predictedMultipliers > targetSpendAmt) {
    overallMultiplierMultiplier = +(targetSpendAmt / predictedMultipliers).toFixed(2);
  } else {
    purchaseAmt = targetSpendAmt / predictedMultipliers;
  }

  const recommendedSettings = {
    overallMultiplierMultiplier,
    purchaseAmt
  };



  return {
    predictedTotalPicks, 
    predictedMultipliers,
    ...recommendedSettings
  };
};