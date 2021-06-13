const theBigLebowski = require('./the-big-lebowski');
const pmJson = require('./pm-json');

module.exports = async () => {

  const lebowskiPms = (
    await theBigLebowski(20)
  ).pmsAnalyzed;

  const pmJsonAnalysis = await pmJson(20);

  strlog({ lebowskiPms, pmJsonAnalysis})

  return lebowskiPms
    .map(pmPerf => ({
      ...pmPerf,
      jsonAnalysis: pmJsonAnalysis[pmPerf.pm]
    }))
    .map(pmPerf => ({
      ...pmPerf,
      min: Math.min(...Object.values(pmPerf.analyzedDates).filter(Boolean))
    }))


};