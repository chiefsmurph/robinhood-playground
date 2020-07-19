module.exports = position => {
  const { 
    ticker,
    daysOld, 
    mostRecentPurchase,
    numMultipliers,
    stSent: { bullBearScore } = {} 
  } = position;
  const conditions = [
    daysOld > 10,
    mostRecentPurchase > 2,
    numMultipliers > 150,
    bullBearScore < 100 || bullBearScore === undefined,
  ];
  return conditions.every(c => c);
};