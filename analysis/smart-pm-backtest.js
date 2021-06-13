// backtest smart-pms to decide what is the optimal daysBack and numChunks inputs
// based upon a given number of days
const fs = require('mz/fs');
const jsonMgr = require('../utils/json-mgr');
const { avgArray } = require('../utils/array-math');
const Combinatorics = require('js-combinatorics');
const smartPms = require('./smart-pms');
const mapLimit = require('promise-map-limit');

const perms = {
    daysBack: [2, 3, 4],
    numChunks: [1, 2, 3, 4, 5, 6]
};

module.exports = async (
        numDays = 5,    // number of days to backtest
    // daysBack = 5,   // number of days to send to smart-pms when calculating smart-pms
    // numChunks = 3   // number of pms to recommend each day
) => {
    // for (let i = 0; i < daysBack; i++) {
    //
    //     console.log(output);
    // }

    let files = await fs.readdir('./json/pm-perfs');

    let sortedFiles = files
        .map(f => f.split('.')[0])
        .sort((a, b) => new Date(a) - new Date(b));


    const lastDay = sortedFiles.pop();
    console.log(sortedFiles, numDays)
    const toBacktest = sortedFiles.slice(0 - numDays);

    console.log('toBacktest', toBacktest);
    console.log('lastDay', lastDay);





    //
    cp = Combinatorics.cartesianProduct(perms.daysBack, perms.numChunks);
    console.log(cp.toArray());



    const comboPerfs = [];
    for (let combo of cp.toArray()) {
        const [daysBack, numChunks] = combo;
        console.log('daysBack', daysBack, 'numChunks', numChunks);


        let index = 0;
        const followingDayPerfs = await mapLimit(toBacktest, 1, async (day) => {
            // console.log(day, index);
            console.log('Backtesting', day);
            const ignoreDays = numDays - index;
            // console.log('ignoreDays', ignoreDays);
            const output = await smartPms(daysBack, numChunks, ignoreDays);
            // console.log(output);
            if (!output.length) {
                console.log('no output length');
                return null;
            }
            const topCombo = output[0].pmList;
            // console.log('Recommended combo: ', topCombo);
            const nextDay = toBacktest[index + 1] || lastDay;
            const nextDayPmPerfs = await jsonMgr.get(`./json/pm-perfs/${nextDay}.json`);
            // console.log('nextDay', nextDay);
            const followingDayTrends = topCombo.map(pm => {
                const foundPerf = nextDayPmPerfs.find(pmObj => pmObj.pm === pm);
                return foundPerf ? Number(foundPerf.avgTrend.slice(0, -1)) : null;
            });
            // console.log('followingDayPerf', followingDayPerf);
            index++;
            return {
                pmPerfs: followingDayTrends,
                avg: avgArray(followingDayTrends.filter(val => !!val))
            };
        });

        const pmPerfs = followingDayPerfs.map(perf => perf.pmPerfs);
        const avgs = followingDayPerfs.map(perf => perf.avg);
        const backtestOutput = {
            settings: {
                daysBack,
                numChunks
            },
            pmPerfs,
            avgs,
            avgPerf: avgArray(avgs.filter(val => !!val))
        };

        comboPerfs.push(backtestOutput);
        console.log(avgs);
        console.log('avg perf: ', backtestOutput.avgPerf)
        console.log('----------------')

    }



    const topRecommendations = comboPerfs
        .sort((a, b) => b.avgPerf - a.avgPerf)
        .slice(0, 3);

    console.log(JSON.stringify(topRecommendations, null, 2));



};
