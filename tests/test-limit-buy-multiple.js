const limitBuyMultiple = require('../app-actions/limit-buy-multiple');

module.exports = async () => {

  await limitBuyMultiple({
    ticker: 'BPMX',
    pickPrice: '.2720',
    quantity: 25,
    
  })

}