const settings = require('../settings');
const pmsAnalysis = require('./pms')
const stratManager = require('../socket-server/strat-manager');


module.exports = async (numDaysBack = 5, includeToday = false) => {

    const analyzePms = async pms => {
        const output = await pmsAnalysis(Number(numDaysBack), 0);
        console.log({ output, numDaysBack });
        return pms
            .map(pm => ({
                // pmName: pm,
                ...output.find(obj => obj.pm === pm)
            }))
            .sort((a, b) => b.avgTrend - a.avgTrend);
    };

    console.log( settings );
    const { forPurchase } = settings;

    let pms = [];
    const strats = [];
    for (let line of forPurchase) {
        if (line.startsWith('[') && line.endsWith(']')) {   // pm
            const pmName = line.substring(1, line.length - 1);
            pms.push(pmName);
        } else {
            strats.push(line);
        }
    }

    pms = [...new Set(pms)];
    const analyzedPms = await analyzePms(pms);
    return analyzedPms;
};