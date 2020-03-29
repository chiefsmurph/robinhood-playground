const fs = require('mz/fs');
const cTable = require('console.table');
const { groupBy, mapObject } = require('underscore');

const getAllPositions = require('./all');
const analyzeGroup = require('./analyze-group');
const DateAnalysis = require('../../models/DateAnalysis');
const getByDateAnalysis = require('./get-bydate-analysis');
const getOverallAnalysis = require('./get-overall-analysis');

const saveDateAnalysis = async byDateAnalysis => {
  for (let { date, ...dateAnalysis } of byDateAnalysis) {
    console.log({
      date,
      dateAnalysis
    })
    await DateAnalysis.findOneAndUpdate(
      { date }, 
      dateAnalysis, 
      { upsert: true }
    );
    console.log(`updated analysis for ${date}`);
  }
};



module.exports = async () => {

  const allPositions = await getAllPositions();

  const byDateAnalysis = getByDateAnalysis(allPositions);
  // const overallAnalysis = getOverallAnalysis(allPositions);
  
  await saveDateAnalysis(byDateAnalysis);

  return {
    byDateAnalysis,
    // overallAnalysis
  };
};