const stratManager = require('../socket-server/strat-manager');
const { emails } = require('../config');
const { partition } = require('underscore');
const settings = require('../settings');

module.exports = async (_, strategy) => {
  await require('../realtime/RealtimeRunner').init(true);
  const pms = require('../realtime/RealtimeRunner').getPms();
  // console.log('pms-hit', { strategy, pms }, settings.forPurchase);

  const matchesPm = pm => {

    
    // console.log({ pm })
    const match = pm => {
      const arrayOfArrays = pms[pm];
      if (!arrayOfArrays) {
        console.log('whatpms', pm);
      }
      return (arrayOfArrays || []).some(parts => {
          parts = Array.isArray(parts) ? parts : [parts];
          return parts.every(part => {
            part = part.toString();
            if (part.startsWith('!')) {
              return !strategy.includes(part.slice(1));
            }
            return (new RegExp(`(?<!!)${part}-`)).test(strategy);
          });
      });
    }
    

    if (pm === 'forPurchase') {
      let [forPurchasePms, forPurchaseStrats] = partition(
          settings.forPurchase, 
          line => (line.startsWith('[') && line.endsWith(']'))
      );

      forPurchasePms = forPurchasePms.map(line => line.substring(1, line.length - 1));
        // console.log({ forPurchasePms })
      return (
        forPurchaseStrats.includes(strategy) ||
        forPurchasePms.some(match)
      );
    } else {
      return match(pm);
    }
  };

  const hits = [
    ...Object.keys(pms),
    'forPurchase'
  ].filter(matchesPm);
  // console.log({ hits })
  return hits;
  
};