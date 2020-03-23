const login = require('./rh-actions/login');
const getTrendBreakdowns = require('./app-actions/get-trend-breakdowns');

const mongoose = require('mongoose');
const { mongoConnectionString } = require('./config');

const Pick = require('./models/Pick');

mongoose.connect(mongoConnectionString, { useNewUrlParser: true });


// node run [filename goes here]
require('./utils/fix-locale-date-string');

(async () => {
    console.log('asd')
    console.log(process.argv, 'ps');
    let Robinhood = await login();
    global.Robinhood = Robinhood;
    const argPath = process.argv[2];
    let relatedFile = require(`./${argPath}`);

    let callArgs = [];
    const restArgs = process.argv.slice(3)
        .map(arg => arg === 'true' ? true : arg)
        .map(arg => arg === 'false' ? false : arg)
        .map(arg => arg === 'undefined' ? undefined : arg)
        .map(arg => arg === '_' ? undefined : arg)
        // .map(arg => arg.includes(',') && arg.split(','));

    strlog({
        callArgs,
        restArgs
    })

    if (argPath.includes('modules/')) {
        const { trendFilter, trendFilterKey } = relatedFile;
        if (trendFilter && trendFilterKey !== null) {
            const trendBreakdowns = await getTrendBreakdowns();
            let trendKeyArg = 'under5';
            if (Object.keys(trendBreakdowns).includes(restArgs[0])) {
                trendKeyArg = restArgs.shift();
                log('supplied', trendKeyArg);
            }
            log({ trendKeyArg })
            const trend = trendBreakdowns[trendKeyArg];
            callArgs.push(trend);
        } else {
            callArgs.push(25); // min
        }
    }

    

    const fnToRun = relatedFile.trendFilter || relatedFile.fn || relatedFile.init || relatedFile.default || relatedFile;
    const response = await fnToRun(...callArgs, ...restArgs);
    console.log('response');
    console.log(JSON.stringify(response, null, 2));

    mongoose.connection.close();
    process.exit();
})();
