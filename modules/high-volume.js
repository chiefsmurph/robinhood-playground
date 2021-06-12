const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');
export default {
    name: 'high-volume',
    trendFilter: async (trend) => {
        console.log('adding overnite jump')
        let withOvernight = await addOvernightJumpAndTSO(trend);
        const withVolumeRatios = withOvernight
            .map(buy => ({
                ...buy,
                absVolume: buy.fundamentals.volume
            }))
            .map(buy => ({
                ...buy,
                volumeTo2Week: buy.absVolume / buy.fundamentals.average_volume_2_weeks,
                twoWeekToAvg: buy.fundamentals.average_volume_2_weeks / buy.fundamentals.average_volume,
                volumeToAvg: buy.absVolume / buy.fundamentals.average_volume,
            }));

        const trendPerms = {
            '': undefined,
            tscPosLt3: o => o.trend_since_prev_close < 3 && o.trend_since_prev_close > 0,
            tscLt3: o => Math.abs(o.trend_since_prev_close) < 3,
        };


        const response = {};
        Object.keys(trendPerms).forEach(key => {

            const innerSorts = [
                'absVolume',
                'volumeTo2Week',
                'twoWeekToAvg',
                'volumeToAvg'
            ];

            innerSorts.forEach(sort => {

                const responseKey = [
                    key,
                    sort
                ].filter(Boolean).join('-');

                const filterFn = trendPerms[key] || (() => true);
                const filtered = withVolumeRatios.filter(filterFn);
                console.log({
                    key,
                    count: filtered.length
                });
                const sorted = filtered.sort((a, b) => b[sort] - a[sort]);
                const sliced = sorted.slice(0, 3);
                response[responseKey] = sliced.map(b => b.ticker);

            });

        });

        return response;
    },
    run: [5, 60, 170, 255]
}