const { alpaca: alpacaConfig } = require('../config');
const Alpaca = require('@alpacahq/alpaca-trade-api');
const alpaca = new Alpaca(alpacaConfig);
const newAvgDowner = require('../utils/new-avg-downer');
const Holds = require('../models/Holds');
const getTrend = require('../utils/get-trend');
const sendEmail = require('../utils/send-email');

strlog({alpaca})

const client = alpaca.websocket
client.onConnect(function() {
  console.log("Connected")
  client.subscribe(['trade_updates', 'account_updates'])
})
client.onDisconnect(() => {
  console.log("Disconnected")
})
client.onStateChange(newState => {
  console.log(`State changed to ${newState}`)
})
client.onOrderUpdate(async data => {
  const stratManager = require('../socket-server/strat-manager');
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

    strlog({
      holdInAlpaca: hold
    });
    if (hold.numMultipliers > 0) {
      console.log('step 1 - the hold has positive multipliers');
      newAvgDowner({
        ticker, 
        buyPrice: filled_avg_price,
      });
    }
    
  } else if (side === 'sell') {
    const position = stratManager.positions.alpaca.find(pos => pos.ticker === ticker) || {};
    const {
      avgEntry: buyPrice,
      buyStrategies,
      quantity: positionQuantity
    } = position;
    closedPosition = Boolean(positionQuantity === filled_qty);

    const theHold = await Holds.registerSell(
      ticker,
      filled_avg_price,
      filled_qty
    );
    
    const deletedHold = closedPosition ? (await theHold.closePosition()).toObject() : null;
    const sellPrice = filled_avg_price;
    const returnDollars = (sellPrice - buyPrice) * qty;
    const returnPerc = getTrend(sellPrice, buyPrice);


    const action = (closedPosition || Math.abs(returnDollars) > 1) ? sendEmail : console.log;
    await action(
      `wow ${closedPosition ? 'CLOSED' : 'SOLD'} ${ticker} return... ${returnDollars} (${returnPerc}%)`, 
      JSON.stringify({
          ticker,
          buyPrice,
          sellPrice,
          qty,
          buyStrategies,
          alpacaOrder: data.order,
          closedPosition,
          deletedHold,
          position
      }, null, 2)
    );

  }

  stratManager.refreshPositions(closedPosition);

})
client.onAccountUpdate(data => {
  console.log(`Account updates: ${JSON.stringify(data)}`)
})
client.onStockTrades(function(subject, data) {
  console.log(`Stock trades: ${subject}, ${data}`)
})
client.onStockQuotes(function(subject, data) {
  console.log(`Stock quotes: ${subject}, ${data}`)
})
client.onStockAggSec(function(subject, data) {
  console.log(`Stock agg sec: ${subject}, ${data}`)
})
client.onStockAggMin(function(subject, data) {
  console.log(`Stock agg min: ${subject}, ${data}`)
})
client.connect();

module.exports = {
    alpaca,
    client
};