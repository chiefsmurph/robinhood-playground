const getPositions = require('./get-positions');
const { alpaca } = require('.');
const { maxPerPositionAfterOpenPerc } = require('../settings');
const alpacaAttemptSell = require('./attempt-sell')
const { onlyUseCash } = require('../settings');
const { sumArray } = require('../utils/array-math');

const definedPercent = {
  DGLY: 20,
};

module.exports = async () => {
  const { equity } = await alpaca.getAccount();

  const maxPerPositionAfterSell = equity * (maxPerPositionAfterOpenPerc / 100);

  const positions = await getPositions();
  strlog({ positions});

  await log(`sell on open... maxPerPositionAfterSell: ${maxPerPositionAfterSell}`, { maxPerPositionAfterOpenPerc });

  const ofInterest = positions
    .filter(p => !p.wouldBeDayTrade)
    .filter(p => Number(p.market_value) > equity / 142); // ~$40
  const totalValue = sumArray(ofInterest.map(p => Number(p.market_value)));


  // onlyUseCash same sell perc for all
  const totalCashTarget = equity / 5;
  const cashOnlySellPerc = totalCashTarget / totalValue * 100;

  for (let p of ofInterest) {
    let { ticker, quantity, percToSell, returnPerc, stSent: { stBracket, bullBearScore } = {}, market_value, numMultipliers, avgMultipliersPerPick, currentPrice } = p;

    let multPullback = (Math.floor(numMultipliers / 200) + Number(avgMultipliersPerPick > 150));

    if (Math.abs(returnPerc) < 3) {
      // sell less
      multPullback++;
    }

    const targetAmt = onlyUseCash ? cashOnlySellPerc : maxPerPositionAfterSell * (multPullback + 2) / 2;
    
    let actualPercToSell = (() => {
      if (percToSell === 100) return 100;
      if (definedPercent[ticker]) return definedPercent[ticker];
      return (1 - targetAmt / Number(market_value)) * 100;
    })();
    
    if (actualPercToSell < 2) continue;

    const stMultiplier = {
      bullish: 0.85,
      bearish: 1.5
    }[stBracket] || 1;

    actualPercToSell = actualPercToSell * stMultiplier;

    actualPercToSell = Math.min(actualPercToSell, 100);

    const qToSell = Math.max(1, Math.floor(Number(quantity) * (actualPercToSell / 100) ));

    const dollarsToSell = qToSell * currentPrice;

    const halfQ = Math.ceil(qToSell / 2);
    const quarterQ = Math.floor((qToSell - halfQ) / 2);
    await alpaca.createOrder({
      symbol: ticker, // any valid ticker symbol
      qty: halfQ,
      side: 'sell',
      type: 'market',
      time_in_force: 'opg',
    }).catch(console.error);
    if (quarterQ) {
      alpacaAttemptSell({
        ticker,
        quantity: quarterQ,
        fallbackToMarket: true,
      });
      setTimeout(() => {
        alpacaAttemptSell({
          ticker,
          quantity: quarterQ,
          fallbackToMarket: true,
        });
      }, 1000 * 60 * 6);
    }
    await log(`selling ${qToSell} shares of ${ticker} (${actualPercToSell}%) out to sell - half attempt, half at market open... good luck! multPullback ${multPullback} stMultiplier ${stMultiplier}`, {
      ticker,
      stMultiplier,
      qToSell,
      actualPercToSell,
      targetAmt,
      multPullback,
      numMultipliers,
      avgMultipliersPerPick,
      dollarsToSell,
      currentPrice
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
};