const allAvgDowners = {};
const AvgDowner = require('./avg-downer');

module.exports = data => {

  const { 
    ticker, 
    buyPrice, 
    // initialTimeout = INITIAL_TIMEOUT, 
    // strategy,
  } = data;
  
  console.log('step 2 - new avg downer fo sho!')
  if (allAvgDowners[ticker]) {
    allAvgDowners[ticker].newBuy(buyPrice);
  } else {
    allAvgDowners[ticker] = new AvgDowner(data);
  }


};


// observe all right before close
const regCronIncAfterSixThirty = require('../utils/reg-cron-after-630');
regCronIncAfterSixThirty({
  name: `final before close observe all avg downers`,
  run: [387],
  fn: async (min) => {
    for (let avgDowner of Object.values(allAvgDowners)) {
      await avgDowner.observe(true);
    }
  }
});