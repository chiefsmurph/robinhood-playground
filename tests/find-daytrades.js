const { alpaca } = require('../alpaca');

module.exports = async () => {
  const orders = await alpaca.getOrders({
    status: 'all',
    after: '2020-03-20T01:25:05.281Z',
    // until: Date,
    limit: 300,
    direction: 'desc'
  });
  const symbols = orders.map(order => order.symbol).uniq();

  const withLastBuys = symbols.map(symbol => ({
    symbol,
    lastBuy: orders.slice().reverse().find(order => order.symbol === symbol && order.side === 'buy')
  }));

  const withLastSells= withLastBuys.map(buy => ({
    ...buy,
    lastSell: orders.slice().reverse().find(order => order.symbol === buy.symbol && order.side === 'sell')
  }));

  const onlyDTs = withLastSells
    .filter(buy => buy.lastBuy && buy.lastSell)
    .filter(buy =>
      (new Date(buy.lastBuy.created_at)).getTime() >
      (new Date(buy.lastSell.created_at)).getTime()
    )

  // const daytrade = symbols.filter(symbol => {
  //   const relatedOrders = orders.filter(order => order.symbol === symbol);
  //   const buy = relatedOrders.find(order => order.side === 'buy');
  //   const sell = relatedOrders.find(order => order.side === 'sell');
  //   return buy && sell;
  // });


  strlog({ onlyDTs })
};