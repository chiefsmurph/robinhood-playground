export default position => {
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
    daysOld > 6,
    Number(market_value) < 20,
    // mostRecentPurchase > 2,
    // numMultipliers > 150,
    // bullBearScore < 100,
  ];
  return conditions.some(Boolean);
};