// find best combination of first1 pm's
// using pm-perfs
const fs = require('mz/fs');
const jsonMgr = require('../utils/json-mgr');
const { avgArray } = require('../utils/array-math');
const Combinatorics = require('js-combinatorics');

const excuseDays = [
    '5-1-2018'
];


const permutator = (inputArr) => {
    let result = [];

    const permute = (arr, m = []) => {
        if (arr.length === 0) {
            result.push(m)
        } else {
            for (let i = 0; i < arr.length; i++) {
                let curr = arr.slice();
                let next = curr.splice(i, 1);
                permute(curr.slice(), m.concat(next))
            }
        }
     }

     permute(inputArr)

     return result;
};

module.exports = async (daysBack = 5, numChunks = 3, ignoreDays = 0) => {

    console.log('daysBack', daysBack);
    console.log('numChunks', numChunks);
    console.log('ignoreDays', ignoreDays);
    let files = await fs.readdir('./json/pm-perfs');

    let sortedFiles = files
        .map(f => f.split('.')[0])
        .slice(0, ignoreDays ? 0 - ignoreDays : Math.Infinity)
        .sort((a, b) => new Date(a) - new Date(b));

    const filesOfInterest = sortedFiles.slice(0 - daysBack);

    console.log(filesOfInterest);


    //-
    const pmCache = {};
    for (let file of filesOfInterest) {
        const json = await jsonMgr.get(`./json/pm-perfs/${file}.json`);
        // console.log(json, 'heyyyy');
        json.forEach(({ pm, avgTrend }) => {
            // if (!(pm.endsWith('sortedByAvgTrend-first1') || pm.endsWith('sortedByPercUp-first1'))) return;
            if (pm.includes('forPurchase')) return;
            // console.log('hereee')
            pmCache[pm] = pmCache[pm] || {};
            pmCache[pm] = {
                ...pmCache[pm],
                [file]: Number(avgTrend.slice(0, -1))
            };
        });
    }

    // Object.keys(pmCache).forEach(pm => {
    //     const numDaysLogged = Object.keys(pmCache[pm]).length;
    //     if (Object.keys(pmCache[pm]).some(key => pmCache[pm][key] < -2)) {
    //         delete pmCache[pm];
    //     }
    // });

    console.log(JSON.stringify(pmCache, null, 2));

    // for each day
    // sort list of pm's ordered
    // pmList: [

    // console.log(Object.keys(pmCache))
    const daysVals = [];

    const pms = Object.keys(pmCache);
    // console.log(pms, numChunks)
    if (Number(numChunks) > pms.length) {
        return null;
    }
    const cmb = Combinatorics.bigCombination(pms, Number(numChunks));
    while (a = cmb.next()) {
        console.log(a);
        const trends = filesOfInterest.map(day => {
            return a.map(pm => pmCache[pm][day]);
        });
        const avgTrends = trends.map(ts => avgArray(ts.filter(val => !!val)))
        const avgOfAvgs = avgArray(avgTrends.filter(val => !!val));
        daysVals.push({
            pmList: a,
            trends,
            avgTrends,
            avgOfAvgs
        });
    }

    // console.log(JSON.stringify(daysVals, null, 2));
    return daysVals
        .filter(dayVal => { // half of the trends half to not be null / undefined
            return dayVal.trends.every((ts, index) => {
                const numNull = ts.filter(t => t === undefined).length;
                const numTotal = ts.length;
                const meetsNullCheck = numNull < numTotal / 2;
                if (!meetsNullCheck) {
                    const relatedDay = filesOfInterest[index];
                    if (excuseDays.includes(relatedDay)) {
                        return true;
                    }
                }
                return meetsNullCheck;
            });
        })
        .sort((a, b) => b.avgOfAvgs - a.avgOfAvgs)
        .slice(0, 5);


};
