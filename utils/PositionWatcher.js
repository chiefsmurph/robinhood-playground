const INITIAL_TIMEOUT = 16 * 1000;      // 10 seconds
const END_AFTER = 2 * 1000 * 60 * 60;   // 2 hr

const { RSI } = require('technicalindicators');

const getHistoricals = require('../realtime/historicals/get');
const getMinutesFromOpen = require('./get-minutes-from-open');
const lookup = require('./lookup');
const getTrend = require('./get-trend');
// const { avgArray } = require('./array-math');
const alpacaLimitSell = require('../alpaca/limit-sell');
const alpacaAttemptSell = require('../alpaca/attempt-sell');
const { alpaca } = require('../alpaca');
const sendEmail = require('./send-email');
const { disableDayTrades } = require('../settings');
const { get } = require('underscore');

const Pick = require('../models/Pick');


const randomString = () => Math.random().toString(36).substring(7);

module.exports = class PositionWatcher {
  constructor({ 
    ticker,
    initialTimeout = INITIAL_TIMEOUT,
  }) {
    Object.assign(this, {
      ticker,
      initialTimeout,
      timeout: initialTimeout,
      alreadyDayTraded: false,
      // avgDownPrices: [],
      lastAvgDown: null,
      id: randomString(),
      observedPrices: []
    });
    console.log('hey whats up from here')
    this.start();
  }
  async start() {
    this.running = true;
    this.startTime = Date.now();
    await this.loadHistoricals();
    this.observe();
  }
  async loadHistoricals() {
    const { ticker } = this;
    const historicals = await getHistoricals(ticker, 5, 5, true);
    const prices = (historicals[ticker] || []).map(hist => hist.currentPrice);
    await log(`loaded historicals for ${ticker}`, { prices });
    this.observedPrices = prices;
  }
  getRelatedPosition() {
    const { ticker } = this;
    const { positions } = require('../socket-server/strat-manager');
    if (!positions) return {};
    return (positions.alpaca || []).find(pos => pos.ticker === ticker) || {};
  }
  async checkRSI() {
    const getRSI = values => {
        const rsiSeries = RSI.calculate({
            values,
            period: 20
        }) || [];
        return rsiSeries.pop();
    };
    const { ticker, observedPrices } = this;
    const [prevRSI, curRSI] = [
      observedPrices.slice(0, observedPrices.length - 1),
      observedPrices
    ].map(getRSI);
    const breaks = [60, 70, 80, 90];
    const foundBreak = breaks.find(b => prevRSI < b && curRSI > b);
    if (!foundBreak) return;
    const { returnPerc, quantity, wouldBeDayTrade, mostRecentPurchase, stSent: { bullBearScore } } = this.getRelatedPosition();
    const canSellBreaks = Boolean(returnPerc > 3 && !wouldBeDayTrade);
    // only sell green positions
    if (!canSellBreaks) return;
    const breakSellPercents = {
      60: 15,
      70: 30,
      80: 40,
      90: 60
    };
    let perc = breakSellPercents[foundBreak]; // perc to sell

    const slowSellConditions = [
      mostRecentPurchase <= 1,
      bullBearScore > 200
    ];
    const slowSellCount = slowSellConditions.filter(Boolean).length;
    for (let i = 0; i < slowSellCount; i++) { 
      perc = perc / 1.2;
    }
    const q = Math.ceil(quantity * perc / 100);
    await log(`${ticker} hit an RSI break - ${foundBreak}${canSellBreaks ? ` & selling ${q} shares (${perc}%)` : ''}`, {
      returnPerc,
      wouldBeDayTrade,
      canSellBreaks
    });
    await alpacaAttemptSell({
      ticker,
      quantity: q,
      fallbackToMarket: true
    });
  }
  async observe(isBeforeClose, buyPrice) {

    const shouldStopReason = this.shouldStop();
    if (shouldStopReason) {
      console.log(`stopping because ${shouldStopReason}`)
      this.running = false;
      return;
    }

    const {
      ticker,
      alreadyDayTraded,
      id
    } = this;

    const {
      avgEntry,
      market_value,
      quantity,
      buys = [],
      // returnPerc,
      numAvgDowners,
      daysOld,
      mostRecentPurchase,
      stSent: { stBracket } = {}
    } = this.getRelatedPosition();
    
    if (!avgEntry) return this.scheduleTimeout();

    // const firstBuy = buys.find(b => b.timestamp);
    // const firstBuyDate = new Date(firstBuy.timestamp);
    
    // const lowestFill = Math.min(
    //   ...(buys || []).map(buy => buy.fillPrice),
    //   buyPrice || Number.POSITIVE_INFINITY
    // );
    const mostRecentBuyPrice = buyPrice || (buys[buys.length - 1] || {}).fillPrice

    const { picks: recentPicks = [] } = (await Pick.getRecentPickForTicker(ticker, true)) || {};
    const mostRecentPick = recentPicks[0] || {};
    const mostRecentPrice = mostRecentPick.price;
    const minSinceMostRecentPick = mostRecentPick.timestamp ? Math.round((Date.now() - (new Date(mostRecentPick.timestamp).getTime())) / (1000 * 60)): Number.POSITIVE_INFINITY;

    strlog({
      recentPicks,
      mostRecentPrice
    });

    const l = await lookup(ticker);
    // strlog({ ticker, l })
    const { currentPrice, askPrice } = l;
    const prices = [
      currentPrice,
      askPrice
    ];
    const isSame = Boolean(JSON.stringify(prices) === JSON.stringify(this.lastPrices));
    const comparePrice = Math.max(...prices);
    this.lastPrices = prices;
    this.observedPrices.push(currentPrice);
    await this.checkRSI();

    // const lowestPrice = Math.min(...prices);
    // const lowestAvgDownPrice = Math.min(...this.avgDownPrices);
    const returnPerc = getTrend(comparePrice, avgEntry);

    // strlog({
    //   ticker,
    //   avgEntry,
    //   prices,

    //   lowestPrice,
    //   trendToLowestAvg,
    //   returnPerc
    // });

    const baseTime = (numAvgDowners + 0.2) * .75;
    const minNeededToPass = isSame ?  baseTime : baseTime * 2;


    const minSinceLastAvgDown = this.lastAvgDown ? Math.round((Date.now() - this.lastAvgDown) / (1000 * 60)): undefined;
    // const isRushed = Boolean(msSinceLastAvgDown < 1000 * 60 * minNeededToPass);
    const skipChecks = isSame;


    // const shouldAvgDown = [trendToLowestAvg, returnPerc].every(trend => isNaN(trend) || trend < -3.7);
    
    // const askToLowestAvgDown = getTrend(askPrice, lowestAvgDownPrice);
    const mostRecentBuyTrend = getTrend(comparePrice, mostRecentBuyPrice);
    // const recentPickTrend = getTrend(comparePrice, mostRecentPrice);

    const totalNum = numAvgDowners + daysOld + mostRecentPurchase;



    const msPast = Date.now() - this.startTime;
    const minPast = Math.floor(msPast / 60000);
    const lessThanTime = (() => {
      if (daysOld) return undefined;
      if (minPast <= 5) return 'isLessThan5Min';
      if (minPast <= 20) return 'isLessThan20Min';
      if (minPast <= 120) return 'isLessThan2Hrs';
    })();
    const fillPickLimit = (() => {
      if (lessThanTime === 'isLessThan5Min') return -2.2;
      if (lessThanTime === 'isLessThan20Min') return -3.2;
      if (lessThanTime === 'isLessThan2Hrs') return -4.2;
      return -5 - (daysOld * 1.7)
    })();


    let shouldAvgDownWhen = [
      fillPickLimit - Number(stBracket === 'bullish'),    // fillPickLimit
      -3.5 - totalNum * 1.2     // returnLimit
    ];
    
    // let shouldAvgDownWhen = [
    //   [-2.5, -12],
    //   [-3, -7],
    //   [-2.5, -4]
    // ];

    // const quickAvgDown = Boolean(minSinceLastAvgDown <= 6);
    // if (quickAvgDown) {
    //   shouldAvgDownWhen = shouldAvgDownWhen.map(limits =>
    //     limits.map(n => n / 2)
    //   );
    // }

    const trendLowerThanPerc = (t, perc) => isNaN(t) || t < perc;
    const passesCheck = ([fillPickLimit, returnLimit]) => (
      trendLowerThanPerc(
        Math.max(
          mostRecentBuyTrend, 
          recentPickTrend
        ),
        fillPickLimit
      )
      && trendLowerThanPerc(returnPerc, returnLimit)
    );
    
    const hitAvgDownWhen = passesCheck(shouldAvgDownWhen);
    const shouldAvgDown = Boolean(hitAvgDownWhen);


    const logLine = `AVG-DOWNER: ${ticker} (${id}) observed at ${currentPrice} / ${askPrice} ...numAvgDowners ${numAvgDowners}, mostRecentPrice ${mostRecentPrice}, mostRecentBuyPrice ${mostRecentBuyPrice}, mostRecentBuyTrend ${mostRecentBuyTrend}, returnPerc ${returnPerc}%, shouldAvgDown ${shouldAvgDown}, hitAvgDownWhen ${hitAvgDownWhen}, shouldAvgDownWhen ${shouldAvgDownWhen}`;
    console.log(logLine);
    
    if (skipChecks) {
      return this.scheduleTimeout();
    }

    const okToAvgDown = Boolean(mostRecentPurchase === 0 || getMinutesFromOpen() > 25) && minSinceMostRecentPick > 3;
    if (shouldAvgDown && okToAvgDown) {
      const realtimeRunner = require('../realtime/RealtimeRunner');
      await realtimeRunner.handlePick({
        strategyName: 'avg-downer',
        ticker,
        keys: {
          [`${daysOld}daysOld`]: Boolean(daysOld),  // only >= 1
          [`${numAvgDowners}count`]: true,
          [this.getMinKey()]: true,
          [lessThanTime]: true,
          isBeforeClose,
          // quickAvgDown,
        },
        data: {
          returnPerc,
          minSinceLastAvgDown,
          // trendToLowestAvg,
        }
      }, true);
      await log(`avging down: ${logLine}`);
      // this.avgDownPrices.push(currentPrice);
      this.lastAvgDown = Date.now();
    } else if (!alreadyDayTraded && returnPerc >= 11 && !disableDayTrades) {
      const account = await alpaca.getAccount();
      const { portfolio_value, daytrade_count } = account;
      if (Number(market_value) > Number(portfolio_value) * 0.29) {
        if (daytrade_count <= 2) {
          await log(`ALERT ALERT - Selling ${ticker} using a daytrade can we get 14% & 17% up?`);
          const firstChunk = Math.round(Number(quantity) / 2.2);
          const secondChunk = firstChunk;//Number(quantity) - firstChunk;
          alpacaLimitSell({
            ticker,
            quantity: firstChunk,
            limitPrice: avgEntry * 1.14,
            timeoutSeconds: 60 * 20,
            fallbackToMarket: false
          });
          alpacaLimitSell({
            ticker,
            quantity: secondChunk,
            limitPrice: avgEntry * 1.26,
            timeoutSeconds: 60 * 20,
            fallbackToMarket: false
          });
          this.alreadyDayTraded = true;
        } else {
          // await sendEmail(`You are at three daytrades but you might want to take a look at ${ticker}`);
          await log(`If I had a daytrade I would use it on ${ticker} but you at 3 daytrades`);
        }
      } else {
        // console.log(`You are doing great, check out ${ticker} but small amt`);
        // await sendEmail(`It's not a big deal (small amt) but you might want to check out ${ticker}`);
      }
    }

    this.scheduleTimeout();
  }
  shouldStop() {
    const min = getMinutesFromOpen();
    return Object.entries({
      notRunning: !this.running,
      hitEndAfter: this.timeout > END_AFTER,
      marketClosed: min > 420 || min < -100
    }).filter(([reason, boolean]) => boolean).map(([ reason ]) => reason).shift();
  }
  stop() {
    this.running = false;
  }
  scheduleTimeout() {
    console.log(`observing again in ${this.timeout / 1000} seconds (${(new Date(Date.now() + this.timeout).toLocaleTimeString())})`)
    this.TO = setTimeout(() => this.running && this.observe(), this.timeout);
    const changeSlightly = (num, variancePercent = 20) => {
      const posOrNeg = Math.random() > 0.5 ? 1 : -1;
      const varianceValue = Math.random() * variancePercent;
      const actualPercChange = posOrNeg * varianceValue;
      const multiplier = actualPercChange / 100 + 1;
      return num * multiplier;
    };
    this.timeout = Math.min(
      changeSlightly(this.timeout * 2), 
      (getMinutesFromOpen() < 0 ? 3 : 5) * 1000 * 60
    );
  }
  newBuy(buyPrice) {
    this.timeout = INITIAL_TIMEOUT;
    clearTimeout(this.TO);
    this.TO = null;
    this.running = true;
    this.observe(false, buyPrice);
  }
  getMinKey() {
    if (!this.startTime) return null;
    const msPast = Date.now() - this.startTime;
    const minPast = Math.floor(msPast / 60000);
    const minKeys = [1, 5, 10, 30, 60, 120];
    const foundMinKey = minKeys.find(min => minPast < min);
    return foundMinKey ? `under${foundMinKey}min` : 'gt120min';
  }
}