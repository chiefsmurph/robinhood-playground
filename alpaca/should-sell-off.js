module.exports = position => {
  const { 
    ticker,
    daysOld, 
    mostRecentPurchase,
    numMultipliers,
    stSent: { bullBearScore = 0 } = {},
    market_value
  } = position;
  // return true;  // nighttrading baby!
  const conditions = [
    daysOld > 3,
    Number(market_value) < 35
    // mostRecentPurchase > 2,
    // numMultipliers > 150,
    // bullBearScore < 100,
  ];
  return conditions.some(Boolean);
};