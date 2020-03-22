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

// const stratPerf = require('../analysis/strat-perf-for-real');
const realtimeRunner = require('../realtime/RealtimeRunner');

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
let server = http.Server(app);
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
let port = process.env.PORT || 3000;
let users = [];
let sockets = {};

// console.log(__dirname, 'dirname');

app.use(compression({}));


const prependFolder = folder => path.join(__dirname, `../${folder}`);
app.use('/', express['static'](prependFolder('client/build')));
app.use('/user-strategies', express['static'](prependFolder('user-strategies/build')));


app.get('/is-jimmy-pick', async (req, res) => {
    const ticker = req.query.ticker;
    strlog({ ticker });
    try {
        res.json(await isJimmyPick(ticker));
    } catch (e) {
        res.error(`There was an error: ${e.toString()}`)
    }
});


io.on('connection', async socket => {

    console.log('new connection');
    
    socket.emit('server:data-update', await stratManager.getWelcomeData());

    socket.on('get-current-prices', async tickers => {
        const response = await lookupMultiple(tickers, true);
        console.log('got current pricessss', response);
        socket.emit('server:current-prices', response);
    });

    socket.on('lookup', async (ticker, cb) => {
        cb(await lookup(ticker));
    });

    socket.on('historicals', async (ticker, period, daysBack, cb) => {
        cb(await getHistoricals(ticker, period, daysBack, true));
    });

    socket.on('slapTheAsk', async (ticker, cb) => {
        const l = await lookup(ticker);
        const amt = 5;
        const quantity = Math.ceil(amt / l.currentPrice);
        cb(await alpacaMarketBuy({
            ticker,
            quantity,
            timeoutSeconds: 10
        }));
    });

    socket.on('getRecentTrends', async (cb) => {
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
            socket.emit('server:user-strat', userStrat);
        }

        return cb(obj);
    });

    socket.on('getDayReports', async cb => {
        console.log('getting day reports');
        cb({ dayReports: await DayReport.find() });
    });

    socket.on('getPickData', async (id, cb) => {
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

    socket.on('getStScore', async (ticker, cb) => {
        console.log(`getting st sent for ${ticker}`);
        cb(
            await getStSentiment(ticker)
        );
    });


    socket.on('pullGit', async cb => {
        console.log('pulling git')
        await exec('git pull origin master');
        cb && cb('DONE PULLING');
    });

    socket.on('restartProcess', async cb => {
        console.log('restarting process')
        await restartProcess();
        cb && cb('DONE RESTARTING');
    });

    socket.on('client:get-pm-analysis', async cb => {
        console.log('get pm analysis');
        const data = await pmPerf();
        console.log('got pm perf')
        socket.emit('server:pm-analysis', data);
    });

    socket.on('client:get-strat-analysis', async cb => {
        console.log('get strat analysis');
        const data = await require('../analysis/spm-recent')();
        console.log('got strat analysis');
        socket.emit('server:strat-analysis', data);
    });

    socket.on('client:run-scan', async ({ period }) => {
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

        socket.emit('server:scan-results', {
            results: stepTwo
        });
    });


    socket.on('client:run-penny', async ({ type, priceRange: { min, max }}) => {
        console.log('running penny scan', type, min, max);
        const scan = pennyScans[type];
        const results = await scan({
            minPrice: min,
            maxPrice: max
        });
        socket.emit('server:penny-results', { results });
    });

    socket.on('disconnect', () => {
        socket.broadcast.emit('userDisconnect');
    });

});


module.exports = new Promise(resolve => {

    server.listen(port, async () => {
        await stratManager.init({ io });
        console.log('[INFO] Listening on *:' + port);
        resolve();
    });
    
});