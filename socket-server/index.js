'use strict';

const util = require('util');
const exec = util.promisify(require('child_process').exec);

const express = require('express');
const http = require('http');
const SocketIO = require('socket.io');
const compression = require('compression');
const stratManager = require('./strat-manager');
const path = require('path');
const DayReport = require('../models/DayReport');
const Pick = require('../models/Pick');

const mapLimit = require('promise-map-limit');
const lookupMultiple = require('../utils/lookup-multiple');
const lookup = require('../utils/lookup');
const getFilesSortedByDate = require('../utils/get-files-sorted-by-date');
const jsonMgr = require('../utils/json-mgr');
const getStSentiment = require('../utils/get-stocktwits-sentiment');
const restartProcess = require('../app-actions/restart-process');
const pmPerf = require('../analysis/pm-perf-for-real');
const getHistoricals = require('../realtime/historicals/get');
const alpacaMarketBuy = require('../alpaca/market-buy');
const isJimmyPick = require('../utils/is-jimmy-pick');

const howManySuddenDrops = require('../tests/how-many-sudden-drops');

// const stratPerf = require('../analysis/strat-perf-for-real');
const realtimeRunner = require('../realtime/RealtimeRunner');
const json2xls = require('json2xls');

const pennyScans = {
    nowheres: require('../scans/nowheres'),
    droppers: require('../scans/droppers'),
    hotSt: require('../scans/hot-st'),
    unfiltered: require('../scans/unfiltered'),
    'volume-increasing-5min': require('../scans/volume-increasing-5min'),
    'volume-increasing-10min': require('../scans/volume-increasing-10min'),
    'new-highs': require('../scans/base/new-highs')
};

let app = express();

let port = process.env.PORT || 3000;
let users = [];
let sockets = {};

// console.log(__dirname, 'dirname');

app.use(compression({}));
app.use(json2xls.middleware);

const prependFolder = folder => path.join(__dirname, `../${folder}`);
app.use('/', express['static'](prependFolder('client/build')));
app.use('/user-strategies', express['static'](prependFolder('user-strategies/build')));

app.get('/jimmy-picks', async (req, res) => {
    const ticker = req.query.ticker;
    if (ticker) {
        return res.json(await isJimmyPick(ticker));
    }
    const {
        lastCollectionRefresh,
        derivedCollections: {
            jimmyCollection
        }
    } = require('../realtime/RealtimeRunner');
    res.json({
        lastCollectionRefresh: (new Date(lastCollectionRefresh)).toLocaleString(),
        allJimmyPicks: jimmyCollection
    });
});

app.get('/by-date-analysis', async (req, res) => {
    const bool = v => v === 'true';
    const { 
        groupByDay = true,
        numDays = undefined,
        excludeActual,
        format
    } = req.query;
    const response = await howManySuddenDrops(bool(groupByDay), Number(numDays), bool(excludeActual));
    if (format && format.includes('xls')) {
        return res.xls('byDateAnalysis.xlsx', response);
    }
    res.json(response);
});




module.exports = new Promise(resolve => {

    const server = app.listen(port, async () => {
        await stratManager.init({ io });
        console.log('[INFO] Listening on *:' + port);
        resolve();
    });
        
    let io = new SocketIO(server, {
        handlePreflightRequest: (req, res) => {
            console.log(req.headers.origin)
            const headers = {
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Pragma",
                "Access-Control-Allow-Origin": req.headers.origin, //or the specific origin you want to give access to,
                "Access-Control-Allow-Credentials": true
            };
            res.writeHead(200, headers);
            res.end();
        }
    });

    io.on('connection', async client => {
        const ip = (client.handshake.headers['x-forwarded-for'] || client.handshake.address.address).split(',')[0];
        const userAgent = client.request.headers['user-agent'];

        const { allowedIps = [] } = await getPreferences();
        if (!allowedIps.includes(ip)) {
            await log(`ERROR: WARNING WARNING NEW ATTEMPT TO HACK! ${ip}`, {
                ip,
                userAgent
            });
            return;
        }

        console.log('new connection');
        log(`new connection: ${ip} (${userAgent}`);
        
        client.emit('server:data-update', await stratManager.getWelcomeData());

        client.on('get-current-prices', async tickers => {
            const response = await lookupMultiple(tickers, true);
            console.log('got current pricessss', response);
            client.emit('server:current-prices', response);
        });

        client.on('lookup', async (ticker, cb) => {
            cb(await lookup(ticker));
        });

        client.on('historicals', async (ticker, period, daysBack, cb) => {
            cb(await getHistoricals(ticker, period, daysBack, true));
        });

        client.on('buy', async ({
            ticker,
            dollars,
            method = 'market'
        }, cb) => {
            const methods = {
                market: alpacaMarketBuy
            };
            const buyFn = methods[method];
            if (!ticker || !dollars || !method || !buyFn) return log('uh oh buy', {
                ticker,
                dollars,
                method
            });
            const l = await lookup(ticker);
            const quantity = Math.ceil(dollarrs / l.currentPrice);
            await log(`client buy ${ticker} - $${dollars} - ${quantity} sharers`);
            cb(
                await buyFn({
                    ticker,
                    quantity,
                    timeoutSeconds: 10
                })
            );
        });

        client.on('getRecentTrends', async (cb) => {
            const mostPopularFiles = (await getFilesSortedByDate('100-most-popular')).slice(-3);
            console.log({ mostPopularFiles })
            const withJSON = await mapLimit(mostPopularFiles, 1, async file => ({
                file,
                json: await jsonMgr.get(`./json/100-most-popular/${file}.json`)
            }));
            console.log({ withJSON})
            const obj = withJSON.reduce((acc, { file, json }) => ({
                ...acc,
                [file]: json
            }), {});

            for (let userStrat of withJSON) {
                client.emit('server:user-strat', userStrat);
            }

            return cb(obj);
        });

        client.on('getDayReports', async cb => {
            console.log('getting day reports');
            cb({ dayReports: await DayReport.find() });
        });

        client.on('getPickData', async (id, cb) => {
            const pickData = await Pick.findById(id, { data: 1 });
            if (pickData) {
                if (!pickData.data) {
                    console.log('uh oh problem getting pick data for ', id);
                    strlog({
                        id,
                        pickData
                    });
                }
                console.log('sending ', pickData.data);
                cb(pickData.data);
            }
            cb(pickData);
        });

        client.on('getStScore', async (ticker, cb) => {
            console.log(`getting st sent for ${ticker}`);
            cb(
                await getStSentiment(ticker)
            );
        });

        client.on('client:get-pm-analysis', async cb => {
            console.log('get pm analysis');
            const data = await pmPerf();
            console.log('got pm perf')
            client.emit('server:pm-analysis', data);
        });

        client.on('client:get-strat-analysis', async cb => {
            console.log('get strat analysis');
            const data = await require('../analysis/spm-recent')();
            console.log('got strat analysis');
            client.emit('server:strat-analysis', data);
        });

        client.on('client:save-preferences', async (preferences, cb) => {
            await savePreferences(preferences);
            cb();
        });

        client.on('client:act', async (method, cb) => {
            const methods = {
                sellOnOpen: require('../alpaca/sell-on-open'),
                actOnMultipliers: require('../alpaca/act-on-multipliers'),
                actOnPositions: require('../alpaca/act-on-positions'),
                actOnZScoreFinal: require('../alpaca/act-on-zscore-final'),
                pullGit: () => log('pulling git') && exec('git pull origin master'),
                restartProcess,
            };
            const actFn = methods[method];
            if (!actFn) return cb('Not a valid action');
            cb(
                await actFn()
            );
        });

        client.on('client:run-scan', async ({ period }) => {
            console.log('run-scan', period);
            const results = period === 'd' 
                ? await require('../realtime/RealtimeRunner').runDaily(true, true)    // skip save
                : await require('../realtime/RealtimeRunner').runAllStrategies([Number(period)], true);
            const stepTwo = results
                .filter(({ strategyName }) => strategyName !== 'baseline')
                .map(pick => ({
                    ...pick,
                    keys: Object.keys(pick.keys).filter(key => pick.keys[key]),
                }))
                .filter(({ keys }) => keys.every(k => !k.toLowerCase().includes("bear")));

            // const withStSent = await mapLimit(
            //     stepTwo,
            //     3, 
            //     async pick => ({
            //         ...pick,
            //         data: {
            //             ...pick.data,
            //             stSent: await getStSentiment(pick.ticker)
            //         }
            //     })
            // );

            client.emit('server:scan-results', {
                results: stepTwo
            });
        });


        client.on('client:run-penny', async ({ type, priceRange: { min, max }}) => {
            console.log('running penny scan', type, min, max);
            const scan = pennyScans[type];
            const results = await scan({
                minPrice: min,
                maxPrice: max
            });
            client.emit('server:penny-results', { results });
        });

        client.on('disconnect', () => {
            client.broadcast.emit('userDisconnect');
        });

    });

});