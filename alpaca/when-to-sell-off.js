module.exports = (position, account) => {
  const { daysOld, stSent: { bullBearScore } = {} } = position;
  const { equity } = account;
  const conditions = [
    daysOld > 10,
    bullBearScore < 180,
    
  ];
};