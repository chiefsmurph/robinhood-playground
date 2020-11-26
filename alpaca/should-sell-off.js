module.exports = position => {
  const { 
    ticker,
    daysOld, 
    mostRecentPurchase,
    numMultipliers,
    stSent: { bullBearScore = 0 } = {} 
  } = position;
  // return true;  // nighttrading baby!
  const conditions = [
    daysOld > 2,
    // mostRecentPurchase > 2,
    // numMultipliers > 150,
    // bullBearScore < 100,
  ];
  return conditions.every(Boolean);
};