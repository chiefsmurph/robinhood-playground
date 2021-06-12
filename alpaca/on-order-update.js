const Holds = require('../models/Holds');
const getTrend = require('../utils/get-trend');
const sendEmail = require('../utils/send-email');
const cancelAllOrders = require('./cancel-all-orders');
const positionExists = require('./position-exists');

const { alpaca } = require('./');

export default async data => {

  // ugh annoying
  const stratManager = require('../socket-server/strat-manager');
  const { watchThis, stopWatching } = require('../utils/position-manager');

  let closedPosition = false;
  console.log(`Order updates: ${JSON.stringify(data)}`);
  const {
    event,
    order: {
      filled_avg_price,
      filled_qty,
      qty,
      side,
      symbol,
    }
  } = data;
  const ticker = symbol;
  const isFill = event === 'fill';
  if (!isFill) {
    return console.log('not a fill');
  }

  if (side === 'buy') {

    const hold = await Holds.registerAlpacaFill({
      ticker,
      alpacaOrder: data.order,
    });

    watchThis({
      ticker, 
      buyPrice: filled_avg_price,
    });
    
  } else if (side === 'sell') {
    const position = ((stratManager.positions || {}).alpaca || []).find(pos => pos.ticker === ticker) || {};
    const {
      avgEntry: buyPrice,
      buyStrategies,
      quantity: positionQuantity
    } = position;

    closedPosition = !await positionExists(ticker);
    // closedPosition = Boolean(positionQuantity === filled_qty);

    const theHold = await Holds.registerSell(
      ticker,
      filled_avg_price,
      filled_qty
    );
    
    const deletedHold = theHold && closedPosition ? (await theHold.closePosition()).toObject() : null;
    const sellPrice = filled_avg_price;
    const returnDollars = (sellPrice - buyPrice) * qty;
    const returnPerc = getTrend(sellPrice, buyPrice);

    if (closedPosition) {
      stopWatching(ticker);  // stop watching
      await cancelAllOrders(ticker);
    }

    // const action = (closedPosition || Math.abs(returnDollars) > 1) ? sendEmail : console.log;
    await log(
      `wow ${closedPosition ? 'CLOSED' : 'SOLD'} ${ticker} return... ${returnDollars} (${returnPerc}%)`, 
      {
          ticker,
          buyPrice,
          sellPrice,
          qty,
          buyStrategies,
          alpacaOrder: data.order,
          closedPosition,
          deletedHold,
      }
    );

  }

  stratManager.refreshPositions(closedPosition);

};