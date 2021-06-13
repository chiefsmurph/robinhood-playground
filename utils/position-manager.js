const allPositionWatchers = {};
const PositionWatcher = require('./PositionWatcher');

module.exports = {
  watchThis: data => {

    const { 
      ticker, 
      buyPrice,
    } = data;
    
    if (allPositionWatchers[ticker]) {
      console.log(`already watching ${ticker} doh!`);
      allPositionWatchers[ticker].newBuy(buyPrice);
    } else {
      console.log(`completely new position watcher - ${ticker}`);
      allPositionWatchers[ticker] = new PositionWatcher(data);
    }
  },

  stopWatching: ticker => {
    if (!allPositionWatchers[ticker]) return;
    allPositionWatchers[ticker].stop();
    allPositionWatchers[ticker] = null;
    delete allPositionWatchers[ticker];
  } 
}


// observe all right before close
const regCronIncAfterSixThirty = require('./reg-cron-after-630');
// regCronIncAfterSixThirty({
//   name: `restart all position watchers`,
//   run: [1],
//   fn: async (min) => {
//     for (let positionWatcher of Object.values(allPositionWatchers)) {
//       await positionWatcher.newBuy();
//     }
//   }
// });
regCronIncAfterSixThirty({
  name: `final before close observe all position watchers`,
  run: [387],
  fn: async (min) => {
    for (let positionWatcher of Object.values(allPositionWatchers)) {
      await positionWatcher.observe(true);
    }
  }
});