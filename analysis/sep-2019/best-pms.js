const allPmAnalysis = require('./all-pm-analysis');

module.exports = async () => {
  const pmAnalysis = await allPmAnalysis();
  return pmAnalysis
    .filter(perf => {
      const {
        pm,
        overallAvg: lebAvg,
        percUp: lebPercUp,
        jsonAnalysis: { daysCount, avgTrend, percUp } = {}
      } = perf;
      return [
        // lebowski perfs,
        lebAvg > 0,
        lebPercUp > 70,
        // json perfs,
        daysCount > 3,
        avgTrend > 4.5,
        percUp > 87,
        pm.split('-').length + 1 === 7
      ].every(Boolean);
    });
};