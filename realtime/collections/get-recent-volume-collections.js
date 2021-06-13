const runScan = require('../../scans/base/run-scan');
const getRecentVolume = require('./get-recent-volume');
const makeUpUpPerms = require('./make-up-up-perms');

module.exports = async () => {

  console.log('getting recent volume collections');
  const scan = await runScan({
    minVolume: 50000,
    minPrice: 0.1,
    maxPrice: 13,
    count: 400,
    includeStSent: false,
    afterHoursReset: true
    // minDailyRSI: 45
  });

  const allTickers = scan.map(result => result.ticker).uniq();
  
  const recentVolumeLookups = await getRecentVolume(allTickers);

  strlog({ allTickers: allTickers.length });

  const withRecentVolume = scan
    .map(result => ({
      ...result,
      recentVolume: recentVolumeLookups[result.ticker],
    }))
    .sort((a, b) => b.recentVolume.ratio - a.recentVolume.ratio);


  // strlog({
  //   topRatio: withRecentVolume.map(({ ticker, recentVolume }) => ({
  //     ticker,
  //     recentVolume
  //   })).slice(0, 6)
  // });


  const recentVolumeCollections = {
      highestRecentVolume: 'avgRecentVolume',
      highestRecentVolumeRatio: 'ratio',
      highestRecentDollarVolume: 'recentDollarVolume'
  };

  return makeUpUpPerms(
    withRecentVolume,
    recentVolumeCollections
  );



};