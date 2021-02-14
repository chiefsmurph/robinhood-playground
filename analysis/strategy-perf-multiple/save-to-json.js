const jsonMgr = require('../../utils/json-mgr');
const getFilesSortedByDate = require('../../utils/get-files-sorted-by-date');
const StratPerf = require('../../models/StratPerf');

module.exports = async (json, fileName) => {
    
    fileName = fileName || (await StratPerf.getUniqueDates()).pop();
    // console.log({ fileName });
    return jsonMgr.save(`./json/strat-perf-multiples/${fileName}.json`, json);

};