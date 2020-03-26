const jsonMgr = require('../utils/json-mgr');
const { CronJob } = require('cron');
const fs = require('mz/fs');
const { uniq, pick } = require('underscore');

// mongo
const Pick = require('../models/Pick');
const Holds = require('../models/Holds');
const DateAnalysis = require('../models/DateAnalysis');

// predictions and past data
const stratPerfOverall = require('../analysis/strategy-perf-overall');

const createPredictionModels = require('./create-prediction-models');

const getTrend = require('../utils/get-trend');
const { avgArray, percUp } = require('../utils/array-math');
const sendEmail = require('../utils/send-email');
const getSettingsString = require('../utils/get-settings-string');
const regCronIncAfterSixThirty = require('../utils/reg-cron-after-630');

const { watchThis } = require('../utils/position-manager');
const cachedPositions = require('../utils/cached-positions');
const getAlpacaPositions = require('../alpaca/get-positions');

const flatten = require('../utils/flatten-array');

const marketClosures = require('../market-closures');

const formatDate = date => date.toLocaleDateString().split('/').join('-');
const getToday = () => formatDate(new Date());

const TickerWatcher = require('./ticker-watcher');

const getBalanceReport = require('./get-balance-report');
const balanceReportManager = require('./balance-report-manager');
const settings = require('../settings');
const getAnalyzedClosed = require('../analysis/positions/get-closed');
const dayInProgres = require('../realtime/day-in-progress');

// const RealtimeRunner = ;

const stratManager = {
    io: null,
    picks: [],
    tickersOfInterest: [],
    // relatedPrices: {},
    curDate: null,
    predictionModels: {},
    pmPerfs: [],
    hasInit: false,
    tickerWatcher: null,    // TickerWatcher instance,
    pmsAnalyzed: {},
    
    async init({ io, dateOverride, lowKey } = {}) {
        if (this.hasInit) return;
        this.hasInit = true;

        this.Robinhood = global.Robinhood;
        this.io = io;
        this.tickerWatcher = new TickerWatcher({
            name: 'stratManager',
            handler: relatedPrices => {
                this.sendToAll('server:pm-perfs', this.calcPmPerfs());;
                this.sendToAll('server:related-prices', relatedPrices);
            }
        });

        // init picks?
        console.log('init refresh')

        console.log('init picks')
        await this.initPicksAndPMs(dateOverride);

        console.log('get prices');
        await this.tickerWatcher.start();


        new CronJob(`59 6 * * 1-5`, () => this.newDay(), null, true);

        
        this.pmsAnalyzed = await require('../analysis/sep-2019/all-pm-analysis')()

        if (!lowKey) {

            try {
                await this.refreshPastData();
            } catch (e) {
                console.log('error refreshing past', e);
            }

            console.log('about to init balance report')
            await balanceReportManager.init((report, additionalAccountInfo) => {
                this.sendToAll('server:balance-report', { report, additionalAccountInfo });
            }, this.curDate);

        }
        
        setInterval(() => this.refreshPositions(), 1000 * 60 * 15);
        await this.refreshPositions(true);

        new CronJob(`5 10 * * 1-5`, () => setTimeout(() => this.resetPositionWatchers(), 15000), null, true);
        if (dayInProgres(35)) {
            this.resetPositionWatchers();
        }

        console.log('initd strat manager');
    },
    async resetPositionWatchers() {
        for (let pos of this.positions.alpaca.sort((a, b) => b.equity - a.equity)) {
            if (pos.daysOld <= settings.continueDownForDays) {
                console.log(`starting avg downer ${pos.ticker} bc less than continueDownForDays days old`)
                watchThis({
                    ticker: pos.ticker,
                    initialTimeout: 6000 + Math.random() * 60000
                });
                await new Promise(resolve => setTimeout(resolve, 15000));
            }
        }
    },
    async getWelcomeData() {
        // console.log('we;come', { pms });
        return {
            ...pick(this, [
                'curDate',
                'picks',
                'predictionModels',
                'pmPerfs',
                'pmsAnalyzed',
                'positions',
                'pastData',
                'analyzedClosed'
            ]),
            relatedPrices: this.tickerWatcher.relatedPrices,
            settings,
            cronString: regCronIncAfterSixThirty.toString(),
            balanceReports: balanceReportManager.getAllBalanceReports(),
            dateAnalysis: await DateAnalysis.find({}).sort({ date: -1 }).lean(),
            overallAnalysis: JSON.parse(await fs.readFile('./json/overall-analysis.json')),
            ...require('../realtime/RealtimeRunner').getWelcomeData(),
            additionalAccountInfo: (await getBalanceReport()).additionalAccountInfo
        };
    },
    async refreshPositions(refreshClosed) {
        console.log('refreshing positions', (new Date().toLocaleTimeString()));
        const positions = {
            robinhood: await cachedPositions(),
            alpaca: await getAlpacaPositions()
        };
        this.positions = positions;
        const positionTickers = Object.values(positions).flatten().map(pos => pos.ticker || pos.symbol);
        strlog({ positionTickers });
        this.tickerWatcher.addTickers(positionTickers);

        if (refreshClosed) {
            const analyzedClosed = await getAnalyzedClosed();
            this.analyzedClosed = analyzedClosed;
        }
        
        this.sendToAll('server:data-update', { 
            positions, 
            analyzedClosed: this.analyzedClosed 
        });
    },
    newPick(data) {

        data.timestamp = Date.now();
        this.tickerWatcher && this.tickerWatcher.addTickers(
            data.withPrices.map(o => o.ticker)
        );
        console.log('new pick', data);
        // if (this.curDate !== getToday()) {
        //     return;
        // }
        this.picks.push(data);
        this.sendToAll('server:picks-data', data);
    },
    getAllPicks() {
        return this.picks;
    },
    sendToAll(eventName, data) {
        // console.log('sending to all', eventName, data, !!this.io);
        this.io && this.io.emit(eventName, data);
    },
    async newDay() {
        console.log('NEW DAY')
        await this.tickerWatcher.lookupRelatedPrices();
        try {
            await this.sendPMReport();
        } catch (e) {
            console.log('error sending report', e);
        }
        await this.refreshPastData();
        this.picks = this.picks.filter(pick => !pick.isRecommended);
        this.tickerWatcher.clearTickers();
        await this.initPicksAndPMs();
        await this.tickerWatcher.lookupRelatedPrices();
        this.sendToAll('server:data-update', await this.getWelcomeData());
    },
    async determineCurrentDay() {
        // calc current date
        const now = new Date();
        const compareDate = new Date();
        compareDate.setHours(6);
        compareDate.setMinutes(59);
        if (compareDate - now > 0) {
            now.setDate(now.getDate() - 1);
        }


        const mostRecentViableDate = date => {
            const day = date.getDay();
            const dateStr = formatDate(date);
            const isWeekend = day === 0 || day === 6;
            const marketClosed = marketClosures.includes(dateStr);
            console.log({
                isWeekend,
                marketClosed,
                dateStr
            })
            return isWeekend || marketClosed
                ? (() => {
                    const yesterday = new Date(date.getTime() - 1000 * 60 * 60 * 24);
                    return mostRecentViableDate(yesterday);
                })()
                : date
        };

        return formatDate(mostRecentViableDate(now));
    },
    async initPicksAndPMs(dateOverride) {
        const dateStr = dateOverride || await this.determineCurrentDay();
        // const hasPicksData = await Pick.countDocuments({ date: dateStr }) > 0;
        // console.log('hasPicksData', hasPicksData);
        // if (hasPicksData) {
            await this.initPicks(dateStr);
        // }
        this.curDate = dateStr;
        console.log('cur date now', this.curDate);
        // await this.refreshPredictionModels();
    },
    async initPicks(dateStr) {
        console.log('init picks', dateStr);

        const recentRecommendations = [] //await Pick.getRecentRecommendations();
        const todaysPicks = await Pick.find(
            { date: dateStr },
            { data: 0 }
        ).lean();
        strlog({ 
            recentRecommendations: recentRecommendations.length,
            todaysPicks: todaysPicks.length 
        });
        const dbPicks = uniq([
            ...todaysPicks,
            ...recentRecommendations
        ], '_id');

        
        const picks = dbPicks
            .filter(pick => pick.timestamp)
            // .filter(pick => !pick.strategyName.includes('afterhours'))
            // .filter(pick => !pick.strategyName.includes('premarket'))
            .map(pick => ({
                ...pick,
                stratMin: `${pick.strategyName}-${pick.min}`,
                withPrices: pick.picks,
                // timestamp: pick.timestamp
            }));

        console.log({
            dbPicks: dbPicks.length,
            picks: picks.length
        });

        console.log('mostRecentDay', dateStr);
        this.curDate = dateStr;

        const tickersOfInterest = flatten(
            picks.map(pick =>
                pick.withPrices.map(({ ticker }) => ticker)
            )
        );

        const uniqTickers = [...new Set(tickersOfInterest)];

        console.log('numUniqTickersOfInterest', uniqTickers.length)

        this.tickerWatcher.clearTickers();
        this.tickerWatcher.addTickers(uniqTickers);
        
        this.picks = picks;

        
    },
    calcPmPerfs() {


        const { relatedPrices } = this.tickerWatcher;

        console.log('getting pms...')
        const realtimePms = require('../realtime/RealtimeRunner').getPms();
        console.log('now calcing pms')
        // console.log({ realtimePms})
        const pmPerfs = Object.keys(realtimePms).map(pmName => {

            const arrayOfArrays = realtimePms[pmName];

            const handlePick = pick => {
                const { withPrices } = pick;
                if (typeof withPrices[0] === 'string') {
                    console.log(`typeof withPrices[0] === 'string'`, {withPrices});
                    return;
                }
                const withTrend = withPrices.map(stratObj => {
                    const relPrices = relatedPrices[stratObj.ticker];
                    if (!relPrices) {
                        console.log('OH NO DAWG', stratObj.ticker, stratObj);
                        return {};
                    }
                    // console.log('relPrices', relPrices, { stratObj });
                    const { lastTradePrice, afterHoursPrice, currentPrice } = relPrices;
                    const nowPrice = currentPrice;    // afterHoursPrice ||
                    // console.log('nowPrice', nowPrice)
                    return {
                        ticker: stratObj.ticker,
                        thenPrice: stratObj.price,
                        nowPrice,
                        trend: getTrend(nowPrice, stratObj.price)
                    };
                });
                return withTrend;
            };

            const foundStrategies = this.picks
                .filter(({ date }) => date === this.curDate)
                .filter(({ stratMin }) => {
                    // console.log({ pmParts })
                    return arrayOfArrays.some(parts => {
                        parts = Array.isArray(parts) ? parts : [parts];
                        return parts.every(part => {
                            part = part.toString();
                            if (part.startsWith('!')) {
                                return !stratMin.includes(part.slice(1));
                            }
                            return (new RegExp(`(?<!!)${part}-`)).test(stratMin);
                        });
                    });
                })
                .map(handlePick)
                .map(withTrend => ({
                    avgTrend: avgArray(withTrend.map(obj => obj.trend)),
                    stratMin: withTrend.stratMin,
                    tickers: withTrend.map(obj => obj.ticker),
                }))
                .filter(Boolean);
            
            // console.log({ stratOrder, withoutDuplicates });

            const weightedTrend = avgArray(foundStrategies.map(obj => obj.avgTrend));
            return {
                pmName: pmName,
                weightedTrend,
                // avgTrend: weightedTrend
                avgTrend: pmName.includes('forPurchase') ? (() => {
                    let copy = [...foundStrategies];
                    const withoutDuplicates = [];
                    foundStrategies.forEach((stratObj, i) => {
                        // console.log({stratOrder, stratMin });
                        if (copy.findIndex(s => JSON.stringify(s) === JSON.stringify(stratObj)) === i) {
                            withoutDuplicates.push(stratObj)
                        }
                    });
                    return avgArray(withoutDuplicates.map(obj => obj.avgTrend));
                })() : weightedTrend,
                count: foundStrategies.length,
                percUp: percUp(foundStrategies.map(obj => obj.avgTrend)) * 100
            };
        })
            .filter(t => !!t.avgTrend)
            .sort((a, b) => Number(b.avgTrend) - Number(a.avgTrend));

    
            
        console.log('done calcing pm perfs')
        this.pmPerfs = pmPerfs;
        return pmPerfs;

    },
    async sendPMReport() {
        console.log('sending pm report');
        // console.log('STRATS HERE', this.predictionModels);
        const pmPerfs = this.calcPmPerfs();
        const emailFormatted = pmPerfs
            .map(pm => `${pm.avgTrend.toFixed(2)}% ${pm.pmName}`)
            .join('\n');
        await sendEmail(`24hr report for ${this.curDate}`, emailFormatted);
        await jsonMgr.save(`./json/pm-perfs/${this.curDate}.json`, pmPerfs);
        console.log('sent and saved pm report');
    },
    async createAndSaveNewPredictionModels(todayPMpath) {
        console.log('creating new prediction models');
        const newPMs = await createPredictionModels(this.Robinhood);
        console.log('saving to', todayPMpath);
        await jsonMgr.save(todayPMpath, newPMs);
        return newPMs;
    },  
    async refreshPredictionModels() {
        console.log('refreshing prediction models');
        // set predictionmodels
        const todayPMpath = `./json/prediction-models/${this.curDate}.json`;
        try {
            var foundDayPMs = await jsonMgr.get(todayPMpath);
        } catch (e) { }
        // console.log('found pms', foundDayPMs);
        this.predictionModels = foundDayPMs ? foundDayPMs : await this.createAndSaveNewPredictionModels(todayPMpath);
    },
    async refreshPastData() {
        console.log('refreshing past data');
        const stratPerfData = await stratPerfOverall(false, 5);
        await this.setPastData(stratPerfData);
    },
    async setPastData(stratPerfData) {
        const stratPerfObj = {};
        stratPerfData.sortedByAvgTrend.forEach(({
            name,
            avgTrend,
            count,
            percUp
        }) => {
            stratPerfObj[name] = {
                avgTrend,
                percUp,
                count
            };
        });
        this.pastData = {
            fiveDay: stratPerfObj
        };
    }
};

module.exports = stratManager;
