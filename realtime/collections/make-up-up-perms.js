module.exports = (results, collections) => {
  return Object.keys(collections)
    .reduce((acc, key) => {
        const prop = collections[key];
        return {
            ...acc,
            [key]: results
                .filter(result => result.recentVolume[prop])
                .sort((a, b) => b.recentVolume[prop] - a.recentVolume[prop])
                .slice(0, 7),
            [`${key}Up`]: results
              .filter(result => result.recentVolume[prop])
              .filter(result => result.recentVolume.recentTrend > 0.2)
              .sort((a, b) => b.recentVolume[prop] - a.recentVolume[prop])
              .slice(0, 7),
            [`${key}UpUp`]: results
              .filter(result => result.recentVolume[prop])
              .filter(result => result.recentVolume.recentTrend > 0.2)
              .filter(result => result.computed.tso > 0.2 && result.computed.tsc > 0.2)
              .sort((a, b) => b.recentVolume[prop] - a.recentVolume[prop])
              .slice(0, 7)
        };
    }, {});
}