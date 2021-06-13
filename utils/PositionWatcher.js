const mongoose = require('mongoose');

const INITIAL_TIMEOUT = 80 * 1000;      // 40 seconds
const END_AFTER = 2 * 1000 * 60 * 60;   // 2 hr

const { RSI } = require('technicalindicators');

const getHistoricals = require('../realtime/historicals/get');
const getMinutesFromOpen = require('./get-minutes-from-open');
const lookup = require('./lookup');
const getTrend = require('./get-trend');
// const { avgArray } = require('./array-math');
const { registerNewStrategy } = require('../app-actions/buys-in-progress');


const limitBuyMultiple = require('../app-actions/limit-buy-multiple');

const alpacaCancelAllOrders = require('../alpaca/cancel-all-orders');
const alpacaLimitSell = require('../alpaca/limit-sell');
const alpacaAttemptSell = require('../alpaca/attempt-sell');
const { alpaca } = require('../alpaca');
const { disableDayTrades, breakdownRSIs } = require('../settings');
const { get } = require('underscore');

const getRecentPicksForTicker = require('./get-recent-picks-for-ticker');
const spraySell = require('../alpaca/spray-sell');


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
      historicalPrices: [],
      observedPrices: [],
      lastRSI: null
    });
    console.log('hey whats up from here')
    this.start();
  }
  async start() {
    this.running = true;
    this.startTime = Date.now();
    await this.loadHistoricals();
    await this.initComparePrice();
    this.observe();
  }
  async initComparePrice() {
    const [recentPick] = await getRecentPicksForTicker({
      ticker: this.ticker,
      limit: 1
    });
    const formatDate = date => date.toLocaleDateString().split('/').join('-');
    const getToday = () => formatDate(new Date());
    const isTodayPick = recentPick.date === getToday();
    const pickPrice = recentPick.picks.find(p => p.ticker === this.ticker).price;
    const pickTimestamp = (new Date(recentPick.timestamp)).getTime();
    Object.assign(this, {
      isTodayPick,
      pickPrice,
      pickTimestamp
    });
    if (isTodayPick) {
      log(`we got a today pick: ${this.ticker}`);
    }
    strlog({
      today: getToday(),
      isTodayPick,
      pickPrice,
      // recentPick
    });
  }
  async loadHistoricals() {
    const { ticker } = this;
    const historicals = await getHistoricals(ticker, 5, 5, true);
    const prices = (historicals[ticker] || []).map(hist => hist.currentPrice);
    await log(`loaded historicals for ${ticker}`, { prices });
    this.historicalPrices = prices;
  }
  getRelatedPosition() {
    return getRelatedPosition(this.ticker);
  }
  async checkRSI() {
    const { ticker } = this;
    const prevRSI = this.lastRSI;
    const curRSI = (this.getRelatedPosition(ticker).scan || {}).fiveMinuteRSI;
    const {
      returnPerc, 
      quantity, 
      wouldBeDayTrade, 
      mostRecentPurchase, 
      stSent: { bullBearScore = 0 },
      numMultipliers,
      avgMultipliersPerPick,
      currentPrice
    } = this.getRelatedPosition();
    if (curRSI > 60) {
      const breaks = [60, 70, 80, 90];
      const foundBreak = breaks.find(b => prevRSI < b && curRSI > b);
      if (!foundBreak) return;
      const canSellUpperBreaks = Boolean(returnPerc > 3 && !wouldBeDayTrade);
      // only sell green positions
      if (!canSellUpperBreaks) return;
      const breakSellPercents = {
        60: 25,
        70: 35,
        80: 45,
        90: 65
      };
      let perc = breakSellPercents[foundBreak]; // perc to sell

      const slowSellConditions = [
        // mostRecentPurchase <= 1,
        // bullBearScore > 200
      ];
      const slowSellCount = slowSellConditions.filter(Boolean).length;
      for (let i = 0; i < slowSellCount; i++) { 
        perc = perc / 1.2;
      }
      const q = Math.ceil(quantity * perc / 100);
      await log(`${ticker} hit an upper RSI break - ${foundBreak}${canSellUpperBreaks ? ` & selling ${q} shares (${perc}%) or about $${Math.round(q * currentPrice)}` : ''}`, {
        returnPerc,
        wouldBeDayTrade,
        canSellUpperBreaks
      });
      await spraySell({
        ticker,
        quantity: q,
        fallbackToMarket: true
      });
    } else {
      const brokeDown = breakdownRSIs.find(rsiBreak => 
        prevRSI > rsiBreak && curRSI < rsiBreak
      );
      const canBuyLowerBreaks = wouldBeDayTrade || (!wouldBeDayTrade && getMinutesFromOpen() > 200);
      if (brokeDown && canBuyLowerBreaks) {
        const account = await alpaca.getAccount();
        const { cash, buying_power, equity } = account;

        const lastObserved = Number(this.observedPrices[this.observedPrices.length - 1]);
        const MIN_DOLLARS = equity * 0.0034;
        const MAX_DOLLARS = equity * 0.03;
        const [minQuantity, maxQuantity] = [MIN_DOLLARS, MAX_DOLLARS].map(amt => Math.ceil(amt / lastObserved));
        const thirdQuantity = Math.max(1, Math.round(quantity / 9));
        const totalPoints = Number(bullBearScore) + Number(numMultipliers) + Number(avgMultipliersPerPick);
        const mult = Math.max(1, Math.ceil((totalPoints - 100) / 100));
        const brokeDownQuantity = Math.min(maxQuantity, Math.max(minQuantity, thirdQuantity * mult));
        const approxValue = lastObserved * brokeDownQuantity;


        

        const { onlyUseCash } = await getPreferences();
        const amtLeft = Number(onlyUseCash ? cash : buying_power);
        const fundsToBuy = amtLeft > approxValue * 1.5;

        
        await log(`daytrader ${ticker} broke down ${brokeDown} RSI purchasing ${brokeDownQuantity} shares (${mult} mult & about $${approxValue}, last seen ${lastObserved})${fundsToBuy ? '' : '--NO FUNDS TO BUY SORRRY AMIGO'}`, {
          ticker,
          brokeDown,
          thirdQuantity,
          totalPoints,
          bullBearScore,
          numMultipliers,
          avgMultipliersPerPick,
          mult,
          brokeDownQuantity,
          approxValue,
          lastObserved
        });
        if (fundsToBuy) {
          registerNewStrategy(ticker, `rsiBreak-rsiBrokeDown${brokeDown}`);
          limitBuyMultiple({  // how is this real
            totalAmtToSpend: approxValue,
            strategy: `RSIBREAK-BROKEDOWN${brokeDown}`,
            withPrices: [{
              ticker,
              price: lastObserved // wat
            }]
          });
        }
      }
    }
    this.lastRSI = curRSI;
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
      id,
      isTodayPick,
      pickPrice,
      pickTimestamp
    } = this;

    const {
      avgEntry,
      market_value,
      quantity,
      wouldBeDayTrade,
      zScoreSum,
      percentOfBalance,
      // stSent: { stBracket } = {}
    } = this.getRelatedPosition();
    
    console.log({ avgEntry})
    if (!avgEntry) return this.scheduleTimeout();

    const l = await lookup(ticker);
    const { currentPrice, askPrice } = l;
    const prices = [
      currentPrice,
      askPrice
    ];
    const observePrice = Math.min(...prices);
    const isSame = Boolean(JSON.stringify(prices) === JSON.stringify(this.lastPrices));
    
    this.lastPrices = prices;
    this.observedPrices.push(currentPrice);

    const returnPerc = getTrend(observePrice, avgEntry);
    
    if (isSame) {
      return this.scheduleTimeout();
    }

    await this.checkRSI();


    // only check for avg-downer if isTodayPick
    const msPast = Date.now() - pickTimestamp;
    const minPast = Math.floor(msPast / 60000);
    console.log({
      ticker,
      isTodayPick,
      minPast,
      pickPrice,
      pickTimestamp
    })
    if (isTodayPick && minPast >= 1) {
      const trendSinceLastPick = getTrend(observePrice, pickPrice);
      const lessThanTime = (() => {
        if (minPast <= 5) return 'isLessThan5Min';
        if (minPast <= 20) return 'isLessThan20Min';
        if (minPast <= 120) return 'isLessThan2Hrs';
      })();
      let avgDownWhenPercDown = (() => {
        if (lessThanTime === 'isLessThan5Min') return -3;
        if (lessThanTime === 'isLessThan20Min') return -4;
        if (lessThanTime === 'isLessThan2Hrs') return -6;
        return -9;
      })();
      const shouldAvgDown = trendSinceLastPick <= avgDownWhenPercDown;
      
      strlog({
        minPast,
        lessThanTime,
        avgDownWhenPercDown,
        shouldAvgDown,
        trendSinceLastPick
      });
  
      if (shouldAvgDown) {
        const realtimeRunner = require('../realtime/RealtimeRunner');
        const zScoreSumKeys = {
          gt40: 40,
          gt30: 30,
          gt20: 20,
          gt10: 10,
          gtZero: 0,
          ltNeg40: -40,
          ltNeg30: -30,
          ltNeg20: -20,
          ltNeg10: -10,
          ltZero: 0,
        };
        const zScoreKey = Object.keys(zScoreSumKeys).find(key => {
          const gt = key.includes('gt');
          const passesGt = gt && zScoreSum > zScoreSumKeys[key];
          const passesLt = !gt && zScoreSum < zScoreSumKeys[key];
          return passesGt || passesLt;
        });
        await realtimeRunner.handlePick({
          strategyName: 'avg-downer',
          ticker,
          keys: {
            [lessThanTime]: lessThanTime,
            isBeforeClose,
            [`zScore${zScoreKey}`]: true
          },
        }, true);
        this.pickTimestamp = Date.now();
        this.pickPrice = currentPrice;
      }

    }


    
    if (wouldBeDayTrade && !alreadyDayTraded && returnPerc >= 11 && !disableDayTrades) {
      const account = await alpaca.getAccount();
      const { daytrade_count } = account;
      if (percentOfBalance > 15) {
        if (daytrade_count <= 2) {
          await log(`ALERT ALERT - Selling ${ticker} using a daytrade can we get 14% & 26% up?`);
          await alpacaCancelAllOrders(ticker, 'buy');
          const firstChunk = Math.round(Number(quantity) / 2.2);
          const secondChunk = firstChunk;//Number(quantity) - firstChunk;
          alpacaLimitSell({
            ticker,
            quantity: firstChunk,
            limitPrice: avgEntry * 1.138,
            timeoutSeconds: 60 * 30,
            fallbackToMarket: false
          });
          alpacaLimitSell({
            ticker,
            quantity: secondChunk,
            limitPrice: avgEntry * 1.26,
            timeoutSeconds: 60 * 40,
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
      marketClosed: min > 510 || min < -100
    }).filter(([reason, boolean]) => boolean).map(([ reason ]) => reason).shift();
  }
  stop() {
    this.running = false;
  }
  scheduleTimeout() {
    console.log(`observing again in ${this.timeout / 1000} seconds (${(new Date(Date.now() + this.timeout).toLocaleTimeString())})`)
    this.TO = setTimeout(() => this.running && this.observe(), this.timeout);
    const changeSlightly = (num, variancePercent = 30) => {
      const posOrNeg = Math.random() > 0.5 ? 1 : -1;
      const varianceValue = Math.random() * variancePercent;
      const actualPercChange = posOrNeg * varianceValue;
      const multiplier = actualPercChange / 100 + 1;
      return num * multiplier;
    };
    this.timeout = Math.min(
      changeSlightly(this.timeout * 2), 
      changeSlightly(10 * 1000 * 60)
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