const fs = require('mz/fs');
const recursiveUrl = require('./recursive-url');
const sendEmail = require('../utils/send-email');

const saveJSON = async (fileName, obj) => {
    await fs.writeFile(fileName, JSON.stringify(obj, null, 2));
};

const getAllTickers = async () => {
    console.log('getting all tickers...');
    const allResults = await recursiveUrl('https://api.robinhood.com/instruments/');
    if (!allResults || !allResults.length || allResults.some(instrument => !instrument)) {
        return sendEmail('allResults not truthy', JSON.stringify(allResults)); // debug
    }
    await saveJSON('./json/stock-data/allStocks.json', allResults);
    return allResults;
};

module.exports = getAllTickers;
