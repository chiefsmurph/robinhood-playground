const StratPerf = require('../models/StratPerf');

const generatePlayouts = async (strategy, buyDate) => {
    const foundPerf = await StratPerf.findOne({
        stratMin: strategy,
        date: buyDate
    });
    console.log('generatePlayouts', {
        strategy,
        buyDate,
        found: !!foundPerf
    })
    if (!foundPerf || !foundPerf.perfs) return [];
    // console.log(Object.keys(foundPerf));
    // console.log('herehere', JSON.stringify(foundPerf, null, 2))
    const foundTrends = foundPerf.toObject().perfs.map(p => p.avgTrend);
    console.log({ foundTrends });
    return foundTrends;
};

module.exports = generatePlayouts;