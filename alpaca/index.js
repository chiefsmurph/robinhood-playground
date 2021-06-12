const { alpaca: alpacaConfig } = require('../config');
const Alpaca = require('@alpacahq/alpaca-trade-api');
const alpaca = new Alpaca(alpacaConfig);
const onOrderUpdate = require('./on-order-update');

// account updates client
const updates_client = alpaca.trade_ws
updates_client.onConnect(function () {
    console.log("Connected")
    const trade_keys = ['trade_updates', 'account_updates']
    updates_client.subscribe(trade_keys);
})
updates_client.onDisconnect(() => {
    console.log("Disconnected")
})
updates_client.onStateChange(newState => {
    console.log(`State changed to ${newState}`)
})
updates_client.onOrderUpdate(onOrderUpdate);
updates_client.onAccountUpdate(data => {
    console.log(`Account updates: ${JSON.stringify(data)}`)
});
updates_client.connect()


// data client updates
// const client = alpaca.data_ws
// client.onConnect(function() {
//   console.log("Connected")
//   client.subscribe(['alpacadatav1/T.FB', 'Q.AAPL', 'A.FB', 'AM.AAPL'])
// })
// client.onDisconnect(() => {
//   console.log("Disconnected")
// })
// client.onStateChange(newState => {
//   console.log(`State changed to ${newState}`)
// })
// client.onStockTrades(function(subject, data) {
//   console.log(`Stock trades: ${subject}, price: ${data.price}`)
// })
// client.onStockQuotes(function(subject, data) {
//   console.log(`Stock quotes: ${subject}, bid: ${data.bidprice}, ask: ${data.askprice}`)
// })
// client.onStockAggSec(function(subject, data) {
//   console.log(`Stock agg sec: ${subject}, ${data}`)
// })
// client.onStockAggMin(function(subject, data) {
//   console.log(`Stock agg min: ${subject}, ${data}`)
// })
// client.connect()


export default {
    alpaca,
    // client
};