const mapLimit = require('promise-map-limit');
const getTrendAndSave = require('../../app-actions/get-trend-and-save');
const addOvernightJumpAndTSO = require('../../app-actions/add-overnight-jump-and-tso');
const getMultipleHistoricals = require('../../app-actions/get-multiple-historicals');
const jsonMgr = require('../../utils/json-mgr');
module.exports = {
    name: 'user-modules',
    // run: [1, 95, 285, 380],
    fn: async (min) => {
        console.log('running user=modules fool');
        const { 
            instruments: top100RHinstruments
        } = await Robinhood.url('https://api.robinhood.com/midlands/tags/tag/100-most-popular/');
        console.log({ top100RHinstruments});
        const detailedInstruments = await mapLimit(top100RHinstruments, 3, Robinhood.url);
        const onlyTickers = detailedInstruments.map(t => t.symbol);
        console.log('done getting instrument details');

        const trend = await getTrendAndSave();
        const trendOfTop100 = trend.filter(t => onlyTickers.includes(t.ticker));
        const withOvernightJump = await addOvernightJumpAndTSO(trendOfTop100);
        const onlyWithFundamentals = withOvernightJump.filter(stock => stock.fundamentals);
        console.log('trendOfTop100', trendOfTop100.length);
        console.log('--------');
        console.log('onlyWithFundamentals', onlyWithFundamentals.length);
        // add historicals
        let allHistoricals = await getMultipleHistoricals(
            onlyWithFundamentals.map(buy => buy.ticker),
            `interval=day`
        );

        let withHistoricals = onlyWithFundamentals.map((buy, i) => ({
            ...buy,
            historicals: allHistoricals[i]
        }));

        await jsonMgr.save(
            `./json/100-most-popular/${(new Date()).toLocaleDateString().split('/').join('-')}-${min}.json`, 
            withHistoricals
        );

        console.log('--------');
        // console.log('withHistoricals', JSON.stringify(withHistoricals, null, 2));
    }
}