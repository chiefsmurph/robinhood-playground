const fs = require('mz/fs');

module.exports = async () => {
  let files = await fs.readdir('./json/strat-perf-multiples');

  let sortedFiles = files
      .map(f => f.split('.')[0])
      .sort((a, b) => new Date(b) - new Date(a));
  console.log({
    mostRecentSPM: sortedFiles[0]
  })
  return require(`../json/strat-perf-multiples/${sortedFiles[0]}`)
  
  // console.log({ sortedFiles })
}