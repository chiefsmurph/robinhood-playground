const limitBuyMultiple = require('../app-actions/limit-buy-multiple');

export default async () => {

  await limitBuyMultiple({
    ticker: 'BPMX',
    pickPrice: '.2720',
    quantity: 25,
    
  })

}