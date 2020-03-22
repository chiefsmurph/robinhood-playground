const addFundemantals = require('../app-actions/add-fundamentals');
const lookup = require('./lookup');
const { mapObject } = require('underscore');
const cacheThis = require('./cache-this');

module.exports = cacheThis(async (ticker = 'BPMX') => {

  try {

    const [withFundamentaks] = await addFundemantals([{ ticker }]);

    const importantData = {
      marketCap: withFundamentaks.fundamentals.market_cap,
      avgVolume: withFundamentaks.fundamentals.average_volume || withFundamentaks.fundamentals.average_volume_2_weeks,
      currentVolume: withFundamentaks.fundamentals.volume,
      currentPrice: (await lookup(ticker)).currentPrice
    };
  
    importantData.relativeVolume = importantData.currentVolume / importantData.avgVolume;
  
    const checks = {
      'market cap under 50 million': ({ marketCap }) => marketCap < 50 * 1000000,
      'avg volume greater than 150k': ({ avgVolume }) => avgVolume > 150000,
      'avg volume less than 600k': ({ avgVolume }) => avgVolume < 600000,
      'current price less than $1.25': ({ currentPrice }) => currentPrice < 1.25,
      'current volume under 500k': ({ currentVolume }) => currentVolume < 500000,
      'relative volume under 0.75': ({ relativeVolume }) => relativeVolume < 0.75
    };
  
    const passedChecks = mapObject(
      checks,
      checkFn => checkFn(importantData)
    );
  
    strlog({ withFundamentaks, importantData, passedChecks })
  
    return {
      importantData,
      passedChecks,
      isJimmyPick: Object.values(passedChecks).every(Boolean)
    };

  } catch (e) {
    return {
      error: e.toString()
    }
  }
  
})