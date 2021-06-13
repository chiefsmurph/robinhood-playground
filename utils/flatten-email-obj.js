const jsonMgr = require('./json-mgr');
const fs = require('mz/fs');
const { emails } = require('../config');

const flatten = require('./flatten-array');

const flattenEmailObj = async () => {

    const getMostRecentPMs = async () => {
        const getMostRecentDay = async () => {
            let files = await fs.readdir('./json/prediction-models');
            let sortedFiles = files
                .map(f => f.split('.')[0])
                .sort((a, b) => new Date(a) - new Date(b));
            return sortedFiles.pop();
        };
    
        const mostRecentDay = await getMostRecentDay();
        console.log({mostRecentDay});
        const mostRecentPMs = await jsonMgr.get(`./json/prediction-models/${mostRecentDay}.json`);
        return mostRecentPMs;
    };

    const todayPMs = await getMostRecentPMs();
    return Object.keys(emails).reduce((acc, email) => ({
        [email]: flatten(
            emails[email]
                .map(pmOrStrat => todayPMs[pmOrStrat] 
                    ? {
                        pm: pmOrStrat,
                        strategies: todayPMs[pmOrStrat]
                    }
                    : pmOrStrat
                )
        ),
        ...acc
    }), {})
    
};

module.exports = flattenEmailObj;