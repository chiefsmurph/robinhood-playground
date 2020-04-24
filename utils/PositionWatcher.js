const INITIAL_TIMEOUT = 16 * 1000;      // 10 seconds
const END_AFTER = 2 * 1000 * 60 * 60;   // 2 hr

const getMinutesFromOpen = require('./get-minutes-from-open');
const lookup = require('./lookup');
const getTrend = require('./get-trend');
// const { avgArray } = require('./array-math');
const alpacaLimitSell = require('../alpaca/limit-sell');
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
      pendingSale: false,
      // avgDownPrices: [],
      lastAvgDown: null,
      id: randomString()
    });
    console.log('hey whats up from here')
    this.start();
  }
  start() {
    this.running = true;
    this.startTime = Date.now();
    this.observe();
  }
  getRelatedPosition() {
    const { ticker } = this;
    const { positions } = require('../socket-server/strat-manager');
    if (!positions) return {};
    return (positions.alpaca || []).find(pos => pos.ticker === ticker) || {};
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
      pendingSale,
      id
    } = this;

    const {
      avgEntry,
      market_value,
      quantity,
      buys,
      // returnPerc,
      numAvgDowners,
      daysOld,
      mostRecentPurchase,
    } = this.getRelatedPosition();
    
    if (!avgEntry) return this.scheduleTimeout();

    const lowestFill = Math.min(
      ...(buys || []).map(buy => buy.fillPrice),
      buyPrice || Number.POSITIVE_INFINITY
    );

    const { picks: recentPicks = [] } = (await Pick.getRecentPickForTicker(ticker, true)) || {};
    const mostRecentPrice = (recentPicks[0] || {}).price;

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


    const minSinceLastAvgDown = this.lastAvgDown ? Math.round((Date.now() - this.lastAvgDown) * 1000 * 60): undefined;
    // const isRushed = Boolean(msSinceLastAvgDown < 1000 * 60 * minNeededToPass);
    const skipChecks = isSame;


    // const shouldAvgDown = [trendToLowestAvg, returnPerc].every(trend => isNaN(trend) || trend < -3.7);
    
    // const askToLowestAvgDown = getTrend(askPrice, lowestAvgDownPrice);
    const lowestFillTrend = getTrend(comparePrice, lowestFill);
    const recentPickTrend = getTrend(comparePrice, mostRecentPrice);

    const totalNum = numAvgDowners + daysOld + mostRecentPurchase;



    const msPast = Date.now() - this.startTime;
    const minPast = Math.floor(msPast / 60000);
    const isLessThan5Min = (minPast <= 5);
    const isLessThan20Min = (minPast <= 20);
    const fillPickLimit = (() => {
      if (isLessThan5Min) return -4;
      if (isLessThan20Min) return -5;
      return -6 - (daysOld * 2.2)
    })();


    let shouldAvgDownWhen = [
      fillPickLimit,    // fillPickLimit
      -4 - totalNum * 1.2     // returnLimit
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
        Math.min(
          // lowestFillTrend, 
          recentPickTrend
        ),
        fillPickLimit
      )
      && trendLowerThanPerc(returnPerc, returnLimit)
    );
    
    const hitAvgDownWhen = passesCheck(shouldAvgDownWhen);
    const shouldAvgDown = Boolean(hitAvgDownWhen);


    const logLine = `AVG-DOWNER: ${ticker} (${id}) observed at ${currentPrice} / ${askPrice} ...numAvgDowners ${numAvgDowners}, mostRecentPrice ${mostRecentPrice}, recentPickTrend ${recentPickTrend}, lowestFill ${lowestFill}, lowestFillTrend ${lowestFillTrend}%, returnPerc ${returnPerc}%, shouldAvgDown ${shouldAvgDown}, hitAvgDownWhen ${hitAvgDownWhen}, shouldAvgDownWhen ${shouldAvgDownWhen}`;
    console.log(logLine);
    
    if (skipChecks) {
      return this.scheduleTimeout();
    }

    if (shouldAvgDown) {
      const realtimeRunner = require('../realtime/RealtimeRunner');
      await realtimeRunner.handlePick({
        strategyName: 'avg-downer',
        ticker,
        keys: {
          [`${daysOld}daysOld`]: Boolean(daysOld),  // only >= 1
          [`${numAvgDowners}count`]: true,
          [this.getMinKey()]: true,
          isLessThan5Min,
          isLessThan20Min: isLessThan20Min && !isLessThan5Min,
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
    } else if (!pendingSale && returnPerc >= 11 && !disableDayTrades) {
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
            limitPrice: avgEntry * 1.17,
            timeoutSeconds: 60 * 20,
            fallbackToMarket: false
          });
          this.pendingSale = true;
        } else {
          // await sendEmail(`You are at three daytrades but you might want to take a look at ${ticker}`);
          // console.log(`You are doing great, check out ${ticker} but you at 3 daytrades`);
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
    this.timeout = Math.min(changeSlightly(this.timeout * 2), 1000 * 60 * 6);
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