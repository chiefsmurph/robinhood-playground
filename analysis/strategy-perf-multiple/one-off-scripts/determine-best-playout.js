const fs = require('mz/fs');
const jsonMgr = require('../../../utils/json-mgr');
const stratPerfMultiple = require('../index');
const { highestPlayoutFn } = require('../generate-breakdowns');

const {
    avgArray,
    // percUp,
    // hundredResult
} = require('../../../utils/array-math');

const playoutsOfInterest = require('./playouts-of-interest');


const getMostRecentForPurchase = async () => {
    const getMostRecentDay = async () => {
        let files = await fs.readdir('./json/prediction-models');
        let sortedFiles = files
            .map(f => f.split('.')[0])
            .sort((a, b) => new Date(a) - new Date(b));
        return sortedFiles.pop();
    };

    const mostRecentDay = await getMostRecentDay();
    console.log(mostRecentDay);
    const mostRecentPMs = await jsonMgr.get(`./json/prediction-models/${mostRecentDay}.json`);
    const { forPurchase } = mostRecentPMs;
    return forPurchase;
};


const determineSingleBestPlayoutFromMultiOutput = pastPerf => {
    const playoutBreakdowns = {};
    pastPerf.forEach(perf => {
        Object.keys(perf.playouts).forEach(playout => {
            playoutBreakdowns[playout] = (playoutBreakdowns[playout] || []).concat(
                perf.playouts[playout].hundredResult
            )
        });
    });
    const playoutAggregated = Object.keys(playoutBreakdowns).reduce((acc, key) => ({
        ...acc,
        [key]: avgArray(playoutBreakdowns[key])
    }), {});
    // console.log(playoutAggregated);
};

const determineIndividualBestPlayoutsFromMultiOutput = pastPerf => {
    const scoreFn = ({ hundredResult, percUp, avgTrend, percHitsPositive, percHitPlayout }, count) =>
        percHitPlayout >= 0.5
            ? hundredResult * (3 * percUp) * avgTrend * (1 * percHitsPositive) * count
            : 0;
    const playoutFilter = playoutKey => playoutsOfInterest.includes(playoutKey);
    const getHighestPlayout = highestPlayoutFn(scoreFn, playoutFilter);
    return pastPerf.map(obj => ({
        strategy: obj.strategy,
        highestPlayout: getHighestPlayout(obj)[1]
    }));
};

module.exports = async (...strategiesForConsideration) => {
    strategiesForConsideration = strategiesForConsideration.filter(v => !!v);
    strategiesForConsideration = strategiesForConsideration.length ? strategiesForConsideration : await getMostRecentForPurchase();
    console.log({ strategiesForConsideration });
    const pastPerf = await stratPerfMultiple(25, ...strategiesForConsideration);
    console.log('pastperf', JSON.stringify(pastPerf, null, 2));
    // determineSingleBestPlayoutFromMultiOutput(pastPerf);
    return determineIndividualBestPlayoutsFromMultiOutput(pastPerf);
};
