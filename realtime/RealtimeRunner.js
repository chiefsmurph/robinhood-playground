const Combinatorics = require('js-combinatorics');
const { mapObject, uniq, pick } = require('underscore');

const { emails } = require('../config');
const getCollections = require('./collections/');
const dayInProgress = require('./day-in-progress');
const getHistoricals = require('./historicals/get');
const daily = require('./historicals/daily');

// app-actions
const recordPicks = require('../app-actions/record-picks');
const runAllPennyScans = require('./run-all-penny-scans');
const sendRecs = require('../app-actions/send-recs');
const restartProcess = require('../app-actions/restart-process');
const redAndBullish = require('../app-actions/red-and-bullish');
const runSuperDown = require('../app-actions/run-super-down');
const buyTheRed = require('../alpaca/buy-the-red');

// rh-actions
const getRisk = require('../rh-actions/get-risk');

// utils
const getMinutesFromOpen = require('../utils/get-minutes-from-open');
const lookupMultiple = require('../utils/lookup-multiple');
const sendEmail = require('../utils/send-email');
const regCronIncAfterSixThirty = require('../utils/reg-cron-after-630');
const getStrategies = require('./get-strategies');
const pmsHit = require('../utils/pms-hit');
const getStSentiment = require('../utils/get-stocktwits-sentiment');
const getDailyKeys = require('../utils/get-daily-keys');
const queryGoogleNews = require('../utils/query-google-news');
const getActiveHalts = require('../utils/get-active-halts');
const { avgArray } = require('../utils/array-math');

// alpaca
const alpacaActOnSt = require('../alpaca/act-on-st');
const alpacaActOnMultipliers = require('../alpaca/act-on-multipliers');
const alpacaActOnZScoreFinal = require('../alpaca/act-on-zscore-final');
const relayMessage = require('../alpaca/relay-message');

// polygon
const polygonEveryFiveMinutes = require('../polygon/every-five-minutes');
const polygonGetBars = require('../polygon/get-bars');

const riskCache = {};
const { RSI } = require('technicalindicators');



const getRSI = values => {
  return RSI.calculate({
      values,
      period: 14
  }) || [];
};


module.exports = new (class RealtimeRunner {
  

  constructor(disabled = false) {
    Object.assign(this, {
      hasInit: false,
      currentlyRunning: false,
      strategies: [],
      priceCaches: {},
      collections: {},
      lastCollectionRefresh: null,
      runCount: 0,
      todaysPicks: [],
      interval: null,
      disabled,
    });
  }

  getCurrentRSI(ticker, min = '5') {
    const priceCache = this.priceCaches[min] || {};
    const allPrices = priceCache[ticker];
    if (!allPrices) return null;
    const rsiSeries = getRSI(allPrices.map(quote => quote.currentPrice));
    const rsi = rsiSeries[rsiSeries.length - 1];
    strlog({ fiveminutersi: ticker, allPrices  });
    return rsi;
  }

  getWelcomeData() {
    return {
      pms: this.getPms(),
      ...pick(this, ['collections', 'derivedCollections', 'lastCollectionRefresh', 'marketSent'])
    };
  }

  async refreshCollections() {

    const {
      baseCollections,
      derivedCollections,
      jimmyCollection
    } = await getCollections(true);
    console.log('got the collections');
    
    let tenCount = Math.round(getMinutesFromOpen() / 10);
    tenCount = tenCount < 0 ? `Neg${Math.abs(tenCount)}` : tenCount;

    // strlog({ tenCount, derivedCollections })


    // this is for recording "derived" collection picks and we are not even fetching those for the time being


    // DISABLED
    // if (!this.hasInit) {
    //   console.log('Im not going to record the derived collections right now because its just a weird time alright.');
    // } else {

    //   const derivedPicks = Object.keys(derivedCollections)
    //     .reduce((acc, collectionName) => [
    //       ...acc,
    //       ...derivedCollections[collectionName].slice(0, 1).map((result, index) => ({
    //         ticker: result.ticker,
    //         strategyName: 'derived',
    //         keys: {
    //           [collectionName]: true,
    //           [`index${index}`]: true,
    //           [`tenMinCount${tenCount}`]: true
    //         }
    //       }))
    //     ], []);

    //   strlog({ derivedPicks });
    //   await mapLimit(derivedPicks, 5, pick => this.handlePick(pick));
    //   this.todaysPicks.push(derivedPicks);
    //   console.log('done recording');
    // }

    this.collections = mapObject(baseCollections, collection => collection.map(t => t.ticker))
    this.derivedCollections = { ...derivedCollections, jimmyCollection };
    this.lastCollectionRefresh = Date.now();

    require('../socket-server/strat-manager').sendToAll(
      'server:data-update',
      pick(this, ['collections', 'derivedCollections', 'lastCollectionRefresh'])
    );

  }

  getAllTickers() {
    return Object.values(this.collections).flatten().uniq();
  }

  async collectionsAndHistoricals() {

    await this.timedAsync(
      'refreshing collections',
      () => this.refreshCollections(),
    );

    const allTickers = this.getAllTickers();


    // await this.timedAsync(
    //   'timing get st sent for all tickers',
    //   async () => {
    //     strlog((await mapLimit(allTickers, 3, async ticker => {
    //       const sent = await getStSentiment(ticker);
    //       console.log('huzzah', ticker, sent);
    //       return {
    //         ticker,
    //         ...sent
    //       };
    //     })).sort((a, b) => b.bullBearScore - a.bullBearScore));
    //     strlog((await mapLimit(allTickers, 3, async ticker => {
    //       const sent = await getStSentiment(ticker);
    //       console.log('huzzah', ticker, sent);
    //       return {
    //         ticker,
    //         ...sent
    //       };
    //     })).sort((a, b) => b.bullBearScore - a.bullBearScore));
    //   },
    // );
    
    await this.timedAsync(
      `loading price caches with historical data for ${allTickers.length} tickers`,
      () => this.loadPriceCachesWithHistoricals(),
    );
  }

  async init(disabled) {

    if (this.hasInit) {
      return;
    }
    
    (await getStrategies()).forEach(strategy => {
      console.log(`init'd ${strategy.strategyName} REALTIME strategy!`);
      this.strategies.push(strategy);
    });

    if (disabled) {
      this.hasInit = true;
      return console.log('nope DISABLED');
    }

    console.log('INITING REALTIME RUNNER'); 

    await this.collectionsAndHistoricals();
    await this.setMarketSent();

    const START_MIN = 5;
    regCronIncAfterSixThirty({
        name: 'RealtimeRunner: start',
        run: [START_MIN],
        fn: () => this.start()
    });

    regCronIncAfterSixThirty({
        name: 'RealtimeRunner: collectionsAndHistoricals',
        run: [-147, -137, -127, -117, -97, -67, -47, -25, -15, -8, 8, 16, 27, 45, 60, 100, 200, 397, 415, 500, 600, 700],
        fn: () => this.collectionsAndHistoricals()
    });

    regCronIncAfterSixThirty({
        name: 'RealtimeRunner: stop',
        run: [570], // 4PM PACIFIC
        fn: () => this.stop()
    });

    // regCronIncAfterSixThirty({
    //     name: 'RealtimeRunner: red-and-bullish',
    //     run: [45, 130, 200, 300],
    //     fn: () => this.redAndBullishPicks()
    // });

    regCronIncAfterSixThirty({
      name: 'RealtimeRunner: buy the red',
      run: [450, 430, 405, 350, 275,
        // 220, 150, 90, 30
      ],
      fn: () => buyTheRed()
    });

    // regCronIncAfterSixThirty({
    //     name: 'RealtimeRunner: first act on st',
    //     run: [8],
    //     fn: () => alpacaActOnSt()
    // });

    regCronIncAfterSixThirty({
      name: 'RealtimeRunner: some extra act on zscore final',
      run: [16, 36, 60, 90, 110, 135],
      fn: () => alpacaActOnZScoreFinal()
    });

    if (dayInProgress(START_MIN)) {
      console.log('in progress');

      const last5Minute = this.getLastTimestamp(5);
      console.log({
        last5Minute,
        formatted: new Date(last5Minute).toLocaleString()
      });
      const diff = Date.now() - last5Minute;
      const from5 = (5 * 1000 * 60) - diff;
      console.log({
        diff: diff / 1000 / 60,
        from5: from5 / 1000 / 60
      });

      setTimeout(() => this.start(), from5);
    } else {
      console.log('not in progress ');
    }

    // afternoon intervals
    const AFTERNOON_START_MIN = 100; // 10:20am
    if (dayInProgress(AFTERNOON_START_MIN)) {
      this.startAfternoonIntervals();
    }
    regCronIncAfterSixThirty({
      name: 'RealtimeRunner: start afternoon intervals',
      run: [AFTERNOON_START_MIN],
      fn: () => this.startAfternoonIntervals()
    });
    
    regCronIncAfterSixThirty({
      name: 'RealtimeRunner: hurry up actOnZScore',
      run: [370],
      fn: () => {
        clearInterval(this.afternoonIntervals[2]);
        this.afternoonIntervals[2] = null;
        this.afternoonIntervals[2] = setInterval(
          () => this.runZScoreFinal(),
          getZScoreInteral()
        );
      }
    });

    this.hasInit = true;
    await log('done initing realtime runner');
    logMemory();
  }

  getZScoreInteral() {
    const minMs = 1000 * 60;
    return minMs * (
      getMinutesFromOpen() >= 369 
        ? 15 // after hours means more frequent
        : 27
    );
  }

  async loadPriceCachesWithHistoricals() {
    this.priceCaches = {};
    const allTickers = Object.values(this.collections).flatten().uniq();
    // const allStratPeriods = this.strategies.map(strategy => strategy.period).flatten().uniq();

    for (let period of [5, 10, 30]) {
      console.log(`starting refreshing ${period} period cache...`);
      this.priceCaches = {
        ...this.priceCaches,
        [period]: await getHistoricals(allTickers, period, 14, true)
      }
      console.log(`done refreshing ${period} period cache...`);
    }
    strlog({ 
      allTickers, 
      priceCaches: mapObject(
        this.priceCaches, 
        priceCache => mapObject(priceCache, historicals => historicals.length)
      )
    });
  }

  async start() {
    console.log('start!!');

    await log('starting realtime runner');

    this.currentlyRunning = true;
    this.runCount = 0;
    this.intervals = [
      setInterval( 
        () => this.timedAsync(
          'every five minutes timerrrr',
          () => this.everyFiveMinutes(),
        ),
        5 * 1000 * 60 // 5 minutes
      ),


      // setTimeout(() => 
      setInterval(
        () => this.timedAsync(
          'every 12 minutes - run super down',
          () => runSuperDown(),
        ),
        60 * 1000 * 12 // 15 min
      ),


      // setInterval(() => 
      //   this.timedAsync(
      //     'every 3 hours (daily)',
      //     () => this.runDaily(),
      //   ),
      //   60 * 1000 * 60 * 3 // 3 hours
      // ),
    ];

    this.everyFiveMinutes();
  }

  async runZScoreFinal() {
    this.timedAsync(
      'every 9 minutes - alpaca act on zscore final',
      () => alpacaActOnZScoreFinal(),
    );
  }

  async startAfternoonIntervals() {
    await log('starting afternoon intervals');
    this.afternoonIntervals = [
      setInterval(
        () => this.timedAsync(
          'every 15 minutes - alpaca act on st',
          () => alpacaActOnSt(),
        ),
        60 * 1000 * 43 // 20 min
      ),

      // setInterval(
      //   () => this.timedAsync(
      //     'every 12 minutes - alpaca act on multipliers',
      //     () => alpacaActOnMultipliers(),
      //   ),
      //   60 * 1000 * 20 // 16 minutes
      // ),

      // setTimeout(() => 
      setInterval(
        () => this.runZScoreFinal(),
        this.getZScoreInteral()
      ),
        // 1000 * 60 * 5
      // ),

    ];
  }

  async stop() {
    await log('STOPPING THE REALTIME RUNNER NOW');
    this.currentlyRunning = false;
    if (this.intervals) {
      this.intervals.forEach(clearInterval);
      this.intervals = [];
    }
    if (this.afternoonIntervals) {
      this.afternoonIntervals.forEach(clearInterval);
      this.afternoonIntervals = [];
    }
  }

  logLastTimestamps() {
    [5, 10, 30].forEach(async period => {
      const curPriceCache = this.priceCaches[period];
      if (!curPriceCache) {
        // we have a serious problem
        await log('ERROR: price caches got messed up!!! ahhh!!');
        return restartProcess();
      }
      const firstTicker = Object.keys(curPriceCache)[0];
      const last5timestamps = curPriceCache[firstTicker]
        .slice(-5)
        .map(quote => new Date(quote.timestamp).toLocaleString());
      console.log(`${period}min period, last 5 timestamps...${last5timestamps}`);
    });
  }
  async addNewQuote(priceCachesToUpdate = Object.keys(this.priceCaches)) {

    console.log('getting new quotes...');
    this.logLastTimestamps();

    const allTickers = Object.values(this.collections).flatten().uniq();
    // console.log({ allTickers })
    const relatedPrices = await lookupMultiple(
        allTickers,
        true
    );

    const addToPriceCache = period => {
      const curPriceCache = this.priceCaches[period];
      Object.keys(relatedPrices).forEach(ticker => {
        if (curPriceCache[ticker]) {
          const curQuote = relatedPrices[ticker];
          curPriceCache[ticker].push({
            timestamp: Date.now(),
            ...curQuote
          });
        } else {
          console.log('no price cache found for ', ticker, period);
        }
      });
      this.priceCaches[period] = curPriceCache;


      this.logLastTimestamps();

    };

    priceCachesToUpdate.forEach(addToPriceCache);

    console.log('done fetching new quote data');
  }

  
  async timedAsync(eventString, asyncFn) {
    eventString = eventString.toUpperCase();
    const startTS = Date.now();
    console.log(`starting ${eventString}...`);
    const response = await asyncFn();
    const endTS = Date.now();
    // await log(`finished ${eventString}, time took to run: ${(endTS - startTS) / 1000}`);
    return response;
  }

  getLastTimestamp(period) {
    console.log('getting last timestamp');
    const relatedPriceCache = this.priceCaches[period];
    // console.log(Object.keys(relatedPriceCache));
    const firstTicker = Object.keys(relatedPriceCache)[0];
    const firstTickerData = relatedPriceCache[firstTicker];
    // console.log({
    //   period,
    //   firstTickerData: JSON.stringify(firstTickerData).slice(0, 20)
    // })
    const firstTickerLastHistorical = firstTickerData[firstTickerData.length - 1];
    if (!firstTickerLastHistorical) {
      log('NO LAST DATA', `no last data ${period}`);
      console.log('WHAT NO LAST DATA', {
        period,
        firstTicker,
        relatedPriceCache
      });
      setTimeout(() => restartProcess(), 2000);
    }
    return (firstTickerLastHistorical || {}).timestamp;
  }
  
  async everyFiveMinutes() {
    if (!this.currentlyRunning) {
      return this.stop();
    }
    
    this.runCount++;

    const lastTS = Object.keys(this.priceCaches).reduce((acc, period) => ({
      ...acc,
      [period]: this.getLastTimestamp(Number(period))
    }), {});
    
    console.log(lastTS);

    const periods = Object.keys(lastTS).filter(period => {
      const lastTimestamp = lastTS[period];
      const fromYesterday = lastTimestamp < Date.now() - 1000 * 60 * 60;
      const compareTS = fromYesterday ? (() => {
        const d = new Date();
        d.setHours(9, 30);
        return d.getTime();
      })() : lastTimestamp;
      
      const diff = Date.now() - compareTS;
      const shouldUpdate = diff > (period - 2) * 1000 * 60;
      console.log(
        'everyFiveMinutes REPORT', 
        this.runCount,
        {
          period,
          fromYesterday,
          compareTS: new Date(compareTS).toLocaleString(),
          shouldUpdate
        }
      );
      return shouldUpdate;
    }).map(Number);
    
    console.log('every five minutes...', { periods, runCount: this.runCount });

    await this.timedAsync(
      'adding new quote',
      () => this.addNewQuote(periods),
    );
    const picks = await this.timedAsync(
      'running all strategies',
      () => this.runAllStrategies(periods),
    );

    let polygonPicks = [];

    // try {
    //   polygonPicks = await this.timedAsync(
    //     'running polygon picks',
    //     () => this.runPolygonStrategy()
    //   );
    // } catch (e) {
    //   await log('error running polygon', { e });
    // }

    if (polygonPicks.length > 10) {
      await log('way too many polygon picks ... slicing', { polygonPicks });
      polygonPicks = polygonPicks.slice(0, 10);
    }

    await this.timedAsync(
      `handling ${picks.length} picks`,
      () => this.handlePicks([...picks, ...polygonPicks], periods),
    );


    // once and hour check?
    const min = (new Date()).getMinutes();
    const topOfHour = Boolean(min < 4);
    if (topOfHour) {
      await this.topOfHour();
    }

  }

  async runPolygonStrategy() {
    const tickersAndAllPrices = await polygonEveryFiveMinutes();
    const suddenDropsStrategy = this.strategies.find(strategy => strategy.strategyName === 'sudden-drops');
    const picks = await this.runSingleStrategy(
      tickersAndAllPrices,
      suddenDropsStrategy,
      'polygon5'
    );
    return picks;
  }

  async penniesAndRecs() {

    // console.log('RUNNING DAILY', nowStr);
    // await this.runDaily();
    
    console.log('RUNNING PENNIES', nowStr);
    await this.runPennies();
  
    console.log('SENDING RECS');
    await sendRecs();
  }

  async topOfHour() {

    const nowStr = (new Date()).toLocaleString();

    await this.timedAsync(
      `ONCE AN HOUR ${nowStr}`,
      async () => {
    
        console.log('COLLECTIONS AND HISTORICALS JUST BECAUSE', nowStr);
        await this.collectionsAndHistoricals();
        await this.setMarketSent();
      }
    );
    
    
  }

  async setMarketSent() {
    // market sentiment
    const marketTickers = [
      'SPY', 
      // 'IWM', 
      // 'RUT', 
      'NASDAQ', 
      'DJIA'
    ];
    const marketSent = await Promise.all(
      marketTickers.map(async ticker => ({
        ticker,
        stSent: await getStSentiment(ticker)
      }))
    );
    this.marketSent = marketSent;

    const avg = avgArray(
      marketSent.map(({ stSent }) => stSent.bullBearScore)
    );
    const marketSentStr = marketSent.map(({ ticker, stSent: { bullBearScore }}) => `${ticker}: ${bullBearScore}`).join(' - ');
    await log(`market sentiment avg at ${avg} - ${marketSentStr}`);
    // await relayMessage();
  }

  async redAndBullishPicks() {
    const radPositions = await redAndBullish();
    const picks = radPositions.map(({ ticker }) => ({
      strategyName: 'red-and-bullish',
      ticker,
    }));
    await log(`red and bullish picks: ${picks.map(p => p.ticker)}`);
    await mapLimit(picks, 5, async pick => {
      pick._id = await this.handlePick(pick);
    });
  }

  async runPennies(skipSave = false) {
    const picks = await runAllPennyScans();

    if (!skipSave) {
      for (let pick of picks) {
        strlog({ pick })
        pick._id = await this.handlePick(pick);
      }
    }

    await sendEmail(
      'PENNY SCAN', 
      JSON.stringify(
        picks.map(pick => ({
          strategyName: pick.strategyName,
          ticker: pick.ticker,
          data: pick.data,
        })), 
        null,
        2
      )
    );
    
    return picks;
  }

  // async runDaily(skipSave = false, runAll) {

  //   console.log('RUNNING DAILY');
  //   const dip = dayInProgress();
  //   const allTickers = this.getAllTickers();
  //   console.log({ dip, allTickers });
  //   const tickersAndAllPrices = await daily({
  //     tickers: allTickers,
  //     includeCurrentPrice: dip
  //   });
  //   const withHandlers = this.strategies
  //       .filter(strategy => strategy.handler)
  //       .filter(strategy => runAll || (strategy.period && strategy.period.includes('d')));
  //   // strlog({ withHandlers });
  //   let picks = [];
  //   for (let strategy of withHandlers) {

  //     picks = [
  //       ...picks,
  //       ...await this.runSingleStrategy(
  //         tickersAndAllPrices,
  //         strategy,
  //         'd'
  //       )
  //     ];
        
  //   }

  //   console.log('daily picks count: ', picks.length);

  //   if (!skipSave) {
  //     for (let pick of picks) {
  //       strlog({ pick })
  //       pick._id = await this.handlePick(pick);
  //     }
  //   }


  //   await sendEmail(
  //     'DAILY', 
  //     JSON.stringify(
  //       picks.map(pick => ({
  //         strategyName: pick.strategyName,
  //         ticker: pick.ticker,
  //         keys: Object.keys(pick.keys).filter(key => pick.keys[key])
  //       })), 
  //       null, 
  //       2
  //     )
  //   );
  //   return picks;

  // }

  async runSingleStrategy(tickersAndAllPrices, strategy, period) {
    const picks = [];
    const { strategyName, handler, collections, excludeCollections } = strategy;
    const filteredByCollections = period && period.toString().includes('polygon') 
      ? tickersAndAllPrices 
      : tickersAndAllPrices.filter(({ ticker }) => {
        const passesCollections = (!collections || collections.some(collection => 
          (this.collections[collection] || []).includes(ticker)
        ));
        const passesExcludesCollections = (!excludeCollections || excludeCollections.every(collection => 
          !(this.collections[collection] || []).includes(ticker)
        ))
        return passesCollections && passesExcludesCollections;
      });
    strlog({
      strategyName,
      tickersAndAllPrices: tickersAndAllPrices.map(t => t.ticker),
      filteredByCollections: filteredByCollections.map(t => t.ticker)
    });
    console.log(`running ${strategyName} against ${period} minute data...`);
    for (let { ticker, allPrices } of filteredByCollections) {
      const response = await handler({
        ticker,
        allPrices,
        collections: this.getCollectionForTicker(ticker)
      });
      if (response && Object.keys(response.keys || {}).filter(key => !!response.keys[key]).length) {
        picks.push({
          ...response,
          ticker,
          period,
          strategyName,
          data: {
            ...response.data,
            allPrices,
          }
        });
      }
    }
    return picks;
  }

  async runAllStrategies(periods = [5, 10, 30], runAll) {
    console.log('run all strategies', periods)
    const runAllStrategiesForPeriod = async period => {
      let picks = [];
      const relatedPriceCache = this.priceCaches[period];
      // strlog({
      //   period,
      //   relatedPriceCache
      // })
      const allTickers = Object.keys(relatedPriceCache);
      const withHandlers = this.strategies
        .filter(strategy => strategy.handler)
        .filter(strategy => runAll || (!strategy.period || strategy.period.includes(period)));
      for (let strategy of withHandlers) {
        picks = [
          ...picks,

          ...await this.runSingleStrategy(

            // tickersAndAllPrices
            allTickers.map(ticker => ({
              ticker,
              allPrices: relatedPriceCache[ticker]
            })),
            strategy,
            period

          )
        ];
      };
      return picks;
    };

    return uniq(
      (
        await mapLimit(periods, 1, runAllStrategiesForPeriod)
      ).flatten(),
      ({ ticker, strategyName }) => [ticker, strategyName].join()
    );

  }

  async runPostRunStrategies(picks, periods) {
    const postRunStrategies = this.strategies.filter(strategy => strategy.postRun);
    const postRunPicks = await mapLimit(postRunStrategies, 1, async ({ strategyName, postRun }) => {
      console.log(`running ${strategyName} REALTIME POSTRUN strategy...`);
      return ((await postRun(
        picks,              // current picks
        this.todaysPicks,   // array of array of past picks,
        periods             // array of periods that were run
      )) || []).map(pick => ({
        ...pick,
        strategyName
      }));
    });
    return postRunPicks.filter(Boolean).flatten();
  }

  async prefetchStSent(picks) {
    const allTickers = picks.map(pick => pick.ticker).uniq();
    // console.log({allTickers});
    const prefetch = (await mapLimit(allTickers, 3, async ticker => {
      const sent = await getStSentiment(ticker);
      // console.log('huzzah', ticker, sent);
      return {
        ticker,
        ...sent
      };
    }));
    console.log({
      allTickers: allTickers.length,
      stSentPrefetch: prefetch.length
    })
  }

  async handlePicks(picks, periods) {

    // prefetch st sent for all picks ---- DISABLED!
    // await this.prefetchStSent(picks);

    // mongo and socket updates
    // for PICKS
    await mapLimit(
      picks.sort((a, b) => b.strategyName.includes('drops') - a.strategyName.includes('drops')),
      5, 
      async pick => {
        pick._id = await this.handlePick(pick);
      }
    );

    // run post run strategies
    const postRunPicks = await this.runPostRunStrategies(picks, periods);
    console.log(`total post run picks: ${postRunPicks.length}`)
    
    // mongo and socket updates
    // for POSTRUNPICKS
    await mapLimit(postRunPicks, 5, async pick => {
      pick._id = await this.handlePick(pick);
    });

    // add to todaysPicks
    this.todaysPicks.push([
      ...picks,
      ...postRunPicks
    ]); // array of arrays
  }

  getCollectionForTicker(ticker) {
    return Object.keys(this.collections).find(collection => 
      (this.collections[collection] || []).includes(ticker)
    );
  }

  async handlePick(pick, minimalist) {

    let { ticker, keys, data, period, strategyName } = pick;


    console.log({
      ticker,
      keys,
      // data,
      period,
      strategyName
    });

    if (!ticker) {
      console.log('no ticker backing out');
      return null;
    }

    const isFirePick = strategyName.includes('sudden') || strategyName.includes('quick');

    const {
      values: dailyValues,
      keys: dailyKeys
    } = await getDailyKeys(ticker);

    const isNotAvgDowner = !strategyName.includes('avg-downer');
    keys = {
      ...keys,
      ...isNotAvgDowner && dailyKeys
    };

    const collectionKey = !strategyName.includes('pennyscan') ? this.getCollectionForTicker(ticker) : undefined;

    if (isFirePick && keys.isOvernight) {
      strategyName = `overnight-${strategyName.split('-')[1]}`;
      delete keys.isOvernight;
    }

    keys = Object.keys(keys)    // remove falsy keys
      .filter(key => keys[key])
      .reduce((acc, key) => ({
        ...acc,
        [key]: keys[key]
      }), {});

    const keyString = Object.keys(keys).join('-');

    const periodKey = (() => {
      if (period === 'polygon5') {
        strategyName = `polygon-${strategyName.split('-')[1]}`;
        return;
      }
      if (period === 'd') return 'daily';
      if (period) return `${period}min`;
    })();
    
    // let [price] = data && data.allPrices 
    //   ? data.allPrices.slice(-1)
    //   : (this.priceCaches[5][ticker] || []).slice(-1);
    // price = (price || {}).currentPrice;
    // const priceKeys = [2, 8, 20, 80, 300, 1000, 5000];
    // const priceKey = priceKeys.find(key => price < key);
    const min = getMinutesFromOpen();
    const minKey = (() => {
        if (min > 390) return 'afterhours';
        if (min > 240) return 'dinner';
        if (min > 120) return 'lunch';
        if (min > 45) return 'brunch';
        if (min > 0) return 'initial';
        return 'premarket';
    })();

    const firstAlertkey = !this.todaysPicks.flatten().find(comparePick =>
      comparePick.ticker === ticker
        && comparePick.period === period
        && comparePick.strategyName === strategyName
    ) ? 'firstAlert' : '';


    let volumeKey, watchoutKey, stSent = {};

    if (!minimalist) {

      // // volumeKey
      // let fundamentals;
      // try {
      //     fundamentals = (await addFundamentals([{ ticker }]))[0].fundamentals;
      // } catch (e) {}
      // const { volume, average_volume } = fundamentals || {};
      // volumeKey = (() => {
      //     if (volume > 1000000 || volume > average_volume * 3.5) return 'highVol';
      //     if (volume < 10000) return 'lowVol';
      // })();
  
      // watchoutKey
      const risk = riskCache[ticker]  || await getRisk({ ticker });
      riskCache[ticker] = risk;
      const { shouldWatchout } = risk;
      watchoutKey = shouldWatchout ? 'watchout' : 'notWatchout';
      
     
    }

    // stSent
    stSent = await getStSentiment(ticker) || {};


    // const pms = await pmsHit(null, pickName);
    // if (pms && pms.length && pms.includes('forPurchase') && !minimalist) {
    //   await sendEmail(`NEW ${strategyName.toUpperCase()} ALERT ${pickName}: ${ticker}`, JSON.stringify(pick, null, 2));
    // }

    // const strategyName = `ticker-watchers-under${priceKey}${watchoutKey}${jumpKey}${minKey}${historicalKey}`;
    const isMajorJump = keyString.includes('majorJump');
    if (isMajorJump && keyString.includes('sudden')) {
      await sendEmail('force', `we got a sudden majorJump: ${ticker}`, Object.keys(emails)[1]); // cell phone
    }
    const activeHalt = isMajorJump && await (async () => {
      console.log(`major jump detected, looking for an active halt....`);
      const allActiveHalts = await getActiveHalts();
      const foundHalt = allActiveHalts.find(halt => halt.issueSymbol === ticker);
      strlog({ allActiveHalts, foundHalt })
      return foundHalt;
    })();
    const haltKey = activeHalt && 'halt';
    if (activeHalt) {
      const haltStr = `--- halt ALERT for ${ticker} ----`;
      await log(haltStr, { activeHalt });
      await sendEmail('force', 'halt ALERT', haltStr, Object.keys(emails)[1]);
    }
    const pickName = [
        strategyName,
        collectionKey,
        periodKey,
        keyString,
        // priceKey && `under${priceKey}`,
        firstAlertkey,
        stSent.stBracket,
        ...stSent.wordFlags || [],
        ...(await queryGoogleNews(ticker) || {}).wordFlags,
        watchoutKey,
        minKey,
        volumeKey,
        haltKey
    ].filter(Boolean).uniq().join('-');
    console.log({pickName});

    
    data = {
      ...data,
      period,
      stSent,
      dailyValues,
    };
    
    if (strategyName.includes('drop')) {
      const polygonBars = Object.values(await polygonGetBars([ticker]));
      data.polygonBars = polygonBars;
    }

    recordPicks(pickName, 5000, [ticker], null, { keys, data });  // dont await?

  }



  getPms() {
    if (!this.hasInit) return {};
    
    if (this.pms) return this.pms;

    const singles = [
      'spy-10min-rsilt30',
      'spy-10min-rsilt25',
      'spy-10min-rsilt20',
      'spy-10min-rsilt15',
      'spy-10min-rsilt10',

      'avg-downer',
      'average-down-recommendation',
      'continue-down',
      'supr-dwn',
      'most-low',
      'isJimmyPick',
      'isRecommendedJimmyPick',
      'red-and-bullish',
      
      ...[
        'initial',
        'brunch',
        'lunch',
        'dinner'
      ],
      ...[5, 10, 30 , 'daily'],
      ...Object.keys(this.collections),
      
      // 'volume-increasing',
      // 'pennyscan-highHit',
      // ...[30, 90, 120, 360].map(period => `pennyscan-highHit${period}`),
      

    ];

    const mustIncludeAll = this.strategies.reduce((acc, { pms, strategyName }) => ({
      ...acc,
      ...Object.keys(pms || {}).reduce((inner, key) => ({
        ...inner,
        [`${strategyName}-${key}`]: [
          ...Array.isArray(pms[key]) ? pms[key] : [pms[key]],
          strategyName
        ]
      }), {
        [strategyName]: [strategyName],
        ...Object.keys(this.collections).reduce((inner, collection) => ({
          ...inner,
          [`${strategyName}-${collection}`]: [strategyName, collection]
        }), {})
      })
    }), {

      ...singles.reduce((acc, collectionName) => ({
        ...acc,
        [collectionName]: collectionName.toString().split('-')
      }), {}),



      // OVERNIGHT DROPS

      ...Combinatorics.cartesianProduct(
        [
          '!watchout',
          'watchout',
        ],
        [
          'majorJump',
          'minorJump',
          'mediumJump'
        ],
        // [
        //   'dinner',
        //   'lunch',
        //   'brunch',
        //   'initial',
        // ],
        [
          ...[
            10,
            15,
            20,
            30,
            40
          ].map(num => `down${num}`),
          'down',
          '!down'
        ],
        // [
        //   ...[
        //     10,
        //     15,
        //     20,
        //     30,
        //     40
        //   ].map(num => `avgh${num}`),
        //   'avgh',
        //   '!avgh'
        // ],

        [
          ...[120, 90, 60, 30].map(num => `straightDown${num}`),
          'straightDown',
          '!straightDown',
        ],
      ).toArray().reduce((acc, arr) => {

        return {
          ...acc,
          ...Combinatorics.power(arr)
            .toArray()
            .filter(s => s && s.length)
            .reduce((inner, combo) => {

              combo = [
                'overnight-drops',
                ...combo
              ];
              return {
                ...inner,
                [combo.join('-')]: combo
              };
              
            }, {})
        }

      }, {}),


      // PENNY SCANS!

      // ...[1, 2, 3, 4].reduce((acc, streak) => ({
      //   ...acc,
      //   [`pennyscan-highHit-streak${streak}`]: ['highHit', `streak${streak}`]
      // }), {}),

      // ...Combinatorics.cartesianProduct(
      //   [
      //     'nowheres',
      //     'hot-st',
      //     'droppers',
      //     'unfiltered'
      //   ],
      //   [
      //     'singleTopVolumeSS',
      //     'singlePercMaxVolSS',
      //     'ss180',
      //     'ssFirstTwo',
      //     'stTrendRatioFirst3',
      //     'worstSsTrendRatio',
      //     'worstSS',
    
      //     ...`
      //       projectedVolume
      //       dollarVolume
      //       highestTrend
            
      //       zScoreVolume
      //       zScoreInverseTrend
      //       zScoreInverseTrendMinusRSI
      //       zScoreInverseTrendPlusVol
      //       zScoreHighSentLowRSI
      //       zScoreMagic
      //       zScoreHotAndCool
      //       zScoreGoingBadLookingGood
      //     `
      //         .split('\n')
      //         .map(t => t.trim())
      //         .filter(Boolean)

      //   ],
      //   [
      //     'initial',
      //     'brunch',
      //     'lunch',
      //     'dinner'
      //   ]
      // ).toArray().reduce((acc, arr) => ({
      //   ...acc,
      //   [`pennyscan-${arr.join('-')}`]: ['pennyscan', ...arr],
      //   [`pennyscan-${arr.slice(0, 2).join('-')}`]: ['pennyscan', ...arr.slice(0, 2)]
      // }), {}),

      // nowheresTopSSPREMARKET: ['nowheres', 'topSS', 'premarket'],



      // AVG DOWNER
      ...Combinatorics.cartesianProduct(
        [
          ...[1, 5, 10, 30, 60, 120].map(n => `under${n}min`),
          'gt120min'
        ],
        [
          ...Array(5).fill(1).map((v, i) => ++i).map(n => `${n}count`)
        ],
        [
          'isBeforeClose'
        ]
      ).toArray().reduce((acc, arr) => {

        return {
          ...acc,
          ...Combinatorics.power(arr)
            .toArray()
            .filter(s => s && s.length)
            .reduce((inner, combo) => {

              combo = [
                'avg-downer',
                ...combo
              ];
              return {
                ...inner,
                [combo.join('-')]: combo
              };
              
            }, {})
        }

      }, {}),


      // DERIVED!
      // ...Combinatorics.cartesianProduct(
      //   [
      //     "realChillNowhereVolume", "realChillMoverVolume", "realChillSlightlyUpVolume", "realChillSlightDownVolume", "realChillMovers", "chillNowhereVolume", "chillMoverVolume", "chillSlightlyUpVolume", "chillSlightDownVolume", "chillMovers", "unfilteredNowhereVolume", "unfilteredMoverVolume", "unfilteredSlightlyUpVolume", "unfilteredSlightDownVolume", "unfilteredMovers", "highestSt",
      //     ...["highestRecentDollarVolume", "highestRecentVolume", "highestRecentVolumeRatio"]
      //       .reduce((acc, val) => [
      //         ...acc,
      //         val,
      //         val + 'Up',
      //         val + 'UpUp'
      //       ], []),
      //   ],
      //   [
      //     ...Array(5).fill(1).map((v, i) => i).map(n => `index${n}`)
      //   ],
      //   [
      //     ...[0, 1, 2, 3, 5, 6, 9, 15, 21, 27, 33, 39, 40, 'Neg3', 'Neg2', 'Neg1', 'Neg13', 'Neg11', 'Neg6', 'Neg4'].map(n => `tenMinCount${n}`)
      //   ],
      //   ['notWatchout', 'watchout']
      // ).toArray().reduce((acc, arr) => {

      //   return {
      //     ...acc,
      //     ...Combinatorics.power(arr)
      //       .toArray()
      //       .filter(s => s && s.length)
      //       .reduce((inner, combo) => {

      //         combo = [
      //           'derived',
      //           ...combo
      //         ];
      //         return {
      //           ...inner,
      //           [combo.join('-')]: combo
      //         };
              
      //       }, {})
      //   }

      // }, {}),



      // done

      

    });



    const onlyShort = obj => 
      Object.keys(obj)
        .filter(key => key.split('-').length < 5)
        .reduce((acc, key) => ({
          ...acc,
          [key]: obj[key]
        }), {});

    // strlog({ mustIncludeAll });

    this.pms = onlyShort({
      ...mapObject(mustIncludeAll, arr => [arr]),
      // ...require('../pms/sep-2019'),
      ...require('../pms/manual'),
    });

    return this.pms;
  }






})();