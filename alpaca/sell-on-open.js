const getPositions = require('./get-positions');
const { alpaca } = require('.');
const alpacaAttemptSell = require('./attempt-sell')
const { sumArray } = require('../utils/array-math');
const getSpyTrend = require('../utils/get-spy-trend');
const spraySell = require('./spray-sell');
const regCronIncAfterSixThirty = require('../utils/reg-cron-after-630');
const Hold = require('../models/Holds');
const Log = require('../models/Log');
const cancelAllOrders = require('./cancel-all-orders');



const liquidateAll = async () => {
  const positions = await alpaca.getPositions();
  for (let position of positions) {
    const { symbol: ticker } = position;
    await cancelAllOrders(ticker);
    const boughtToday = await Log.boughtToday(ticker);
    await log(`ticker ${ticker} - boughtToday ${boughtToday}`);
    if (!boughtToday) {
      await alpaca.closePosition(ticker);
      await log(`liquidated ${ticker}`);
    } else {
      await log(`no liquidation necessary ${ticker}`);
    }
  }
}

module.exports = async () => {

  const { onlyUseCash, maxPerPositionAfterOpenPerc = 40, bullishTickers = [], definedPercent = {} } = await getPreferences();
  const { equity } = await alpaca.getAccount();

  const maxPerPositionAfterSell = equity * (maxPerPositionAfterOpenPerc / 100);

  const positions = await getPositions();
  strlog({ positions});

  await log(`sell on open... maxPerPositionAfterSell: ${maxPerPositionAfterSell}`, { maxPerPositionAfterOpenPerc });


  if (maxPerPositionAfterOpenPerc === 0) {
    regCronIncAfterSixThirty({
      name: `liquidate all`,
      run: [65],
      fn: () => liquidateAll()
    });
  }


  const ofInterest = positions
    .filter(p => !p.wouldBeDayTrade)
    .filter(p => Number(p.market_value) > equity / 142); // ~$40



  // const totalValue = sumArray(ofInterest.map(p => Number(p.market_value)));
  // onlyUseCash same sell perc for all
  // const totalCashTarget = equity / 5;
  // const cashOnlySellPerc = totalCashTarget / totalValue * 100;

  strlog({
    ofInterest
  })


  for (let p of ofInterest) {
    let { ticker, quantity, percToSell, returnPerc, stSent: { stBracket, bullBearScore } = {}, market_value, numMultipliers, avgMultipliersPerPick, currentPrice } = p;

    // const multiplierMult = Math.floor(numMultipliers / 300) + Number(avgMultipliersPerPick > 150);
    // const downPercMult = returnPerc > 0 ? 0 : Math.abs(Math.floor(returnPerc / 3));

    // let multPullback = multiplierMult + downPercMult;

    // const isBullishTicker = bullishTickers.includes(ticker);
    // if (isBullishTicker) {
    //   // boom go for the gold I say!
    //   multPullback = multPullback * 1.5;
    // }

    // const stMultiplier = {
    //   bullish: 1.5,
    //   bearish: 0.8
    // }[stBracket] || 1;

    // multPullback = Math.floor(multPullback * stMultiplier);

    // const targetAmt = onlyUseCash ? cashOnlySellPerc : maxPerPositionAfterSell * (multPullback + 3) / 3;
    const targetAmt = maxPerPositionAfterSell;
    console.log({ targetAmt });



    let actualPercToSell = (() => {
      if (percToSell === 100) return 100;
      if (definedPercent[ticker]) return definedPercent[ticker];

      // calc [erc based pm targetAmt
      let perc = (1 - targetAmt / Number(market_value)) * 100;;

      perc = Math.min(perc, 100);

      return perc;
    })();

    const sellOffStr = actualPercToSell === 100 ? 'SELLING OFF ' : '';
    await log(`${sellOffStr}${ticker} IS SELLING ${actualPercToSell}%`)

    console.log({ actualPercToSell })
    
    if (actualPercToSell < 2) continue;

    const qToSell = Math.max(1, Math.floor(Number(quantity) * (actualPercToSell / 100) ));
    const dollarsToSell = qToSell * currentPrice;

    let firstQ = Math.ceil(qToSell / 2);
    const secondQ = qToSell - firstQ;
    // if (returnPerc < 0) firstQ /= 2;
    // const quarterQ = Math.floor((qToSell - halfQ) / 2);

    await Hold.updateOne({ ticker }, { isSelling: true });
    await log(`isSelling true ${ticker} sellonopen`);

    const marketQ = Math.ceil(firstQ / 3);

    await alpaca.createOrder({
      symbol: ticker, // any valid ticker symbol
      qty: marketQ,
      side: 'sell',
      type: 'market',
      time_in_force: 'opg',
    }).catch(console.error);


    spraySell({
      ticker,
      quantity: firstQ - marketQ,
      numSeconds: 60 * 40
    });

    // regCronIncAfterSixThirty({
    //   name: `start spray selling ${ticker}`,
    //   run: [-5],
    //   fn: () => {
        
    //   }
    // });



    // if (quarterQ) {
    //   alpacaAttemptSell({
    //     ticker,
    //     quantity: quarterQ,
    //     fallbackToMarket: true,
    //   });
    //   setTimeout(() => {
    //     alpacaAttemptSell({
    //       ticker,
    //       quantity: quarterQ,
    //       fallbackToMarket: true,
    //     });
    //   }, 1000 * 60 * 6);
    // }

    regCronIncAfterSixThirty({
      name: `start spray selling ${ticker}`,
      run: [30],
      fn: () => {
        spraySell({
          ticker,
          quantity: secondQ,
          numSeconds: 60 * 30
        });
      }
    });
    
    await log(`selling ${qToSell} shares of ${ticker} $${market_value} -> $${Number(market_value) - dollarsToSell} (${Math.round(actualPercToSell)}%) out to sell ... good luck!`, {
      ticker,
      // stMultiplier,
      qToSell,
      actualPercToSell,
      targetAmt,
      dollarsToSell,
      currentPrice,
      definedPercent: definedPercent[ticker]
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
};