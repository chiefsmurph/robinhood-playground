const getHistoricals = require('../realtime/historicals/get');
const getTrend = require('./get-trend');
const { avgArray } = require('./array-math');
const lookup = require('./lookup');
const getBalance = require('../alpaca/get-balance');

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
  const predictedSuddenDrops = Math.round(avgDistance * Math.abs(trendSincePrevClose) * 4.5);
  strlog({ spyHistoricals: spyHistoricals.reverse(), distances, avgDistance, currentPrice, quote, trendSincePrevClose });



  const AVG_PICK_MULTIPLIER = 40;
  const predictedTotalPicks = predictedSuddenDrops * 1.3;
  const predictedMultipliers = (predictedTotalPicks) * AVG_PICK_MULTIPLIER;


  const balance = await getBalance();
  const targetSpendAmt = balance * 0.75;
  strlog({ 
    balance, 
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
    overallMultiplierMultiplier = targetSpendAmt / predictedMultipliers;
  } else {
    purchaseAmt = targetSpendAmt / predictedMultipliers;
  }

  const recommendedSettings = {
    overallMultiplierMultiplier,
    purchaseAmt
  }



  return recommendedSettings;
};