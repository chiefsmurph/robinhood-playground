const Log = require('../models/Log');
const { mapObject, pick } = require('underscore');

const getHistoricals = require('../realtime/historicals/get');

const parseTitle = title => {
    const [overallSentiment, ...tuples] = title.split(' - ').map((v, i) => {
        if (i === 0) {
            return v.split(' ').pop();
        }
        return v.split(': ');
    });
    return mapObject({
        overallSentiment,
        ...tuples.reduce((acc, [stock, value]) => ({
            ...acc,
            [stock]: value
        }), {})
    }, Math.round);
};

export default async () => {
    const allLogs = await Log.find({ title: /sentiment/ }).lean();

    let { SPY: historicals } = await getHistoricals(['SPY'], 30, 90);
    historicals = historicals.map(hist => ({
        ...hist,
        dateFormatted: (new Date(hist.date)).toLocaleString()
    }))
    // strlog({ historicals });

    const withData = allLogs
        .map(log => ({
            formattedDate: (new Date(log.timestamp)).toLocaleString(),
            ...pick(
                parseTitle(log.title),
                ['SPY', 'overallSentiment']
            ),
            currentSPY: historicals.find(hist => hist.timestamp > (new Date(log.timestamp)).getTime())?.currentPrice,
        }));
    return withData;
};