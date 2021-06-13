// utils
const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');
const getTrend = require('../utils/get-trend');
const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');

const trendFilter = async (trend) => {

    const analyzeForDowners = async interval => {

        let allHistoricals = await getMultipleHistoricals(
            trend.map(buy => buy.ticker),
            `interval=${interval}`
        );

        let withHistoricals = trend.map((buy, i) => ({
            ...buy,
            historicals: allHistoricals[i]
        }));

        let withPercDown = withHistoricals
            .map(buy => {
                const { historicals } = buy;
                const percDownLowClose = historicals.filter(({ open_price, close_price, low_price }) => {
                    return [
                        close_price,
                        low_price
                    ].some(price => price < open_price);
                }).length / historicals.length;

                const percDownCloseOnly = buy.historicals.filter(({ open_price, close_price }) => {
                    return close_price < open_price;
                }).length / historicals.length;

                const trendPerc = getTrend(historicals[historicals.length - 1].close_price, historicals[0].open_price);

                return {
                    ...buy,
                    percDownLowClose,
                    percDownLowClosePoints: percDownLowClose * trendPerc,
                    percDownCloseOnly,
                    percDownCloseOnlyPoints: percDownCloseOnly * trendPerc,
                    trendPerc
                };

            })
            .filter(buy => buy.trendPerc < -1)
            .map(buy => {
                // delete buy.historicals;
                return buy;
            });

        withPercDown = await addOvernightJumpAndTSO(withPercDown);

        // console.log('with', JSON.stringify(withPercDown, null, 2));
        const orderBy = (what, trend) => {
            return trend
                .sort((a, b) => a[what] - b[what])
                .slice(0, 1)
                .map(buy => buy.ticker);
        };


        const filtered = (ratio) => withPercDown.filter(({ percDownLowClose, percDownCloseOnly }) => {
            return percDownLowClose < ratio && percDownCloseOnly < ratio;
        });

        const onlyOvernightDown5 = withPercDown.filter(buy => buy.overnightJump < -5);
        const onlyOvernightUp5 = withPercDown.filter(buy => buy.overnightJump > 5);

        return [
            'percDownLowClose',
            'percDownCloseOnly',
            'percDownLowClosePoints',
            'percDownCloseOnlyPoints'
        ].reduce((acc, val) => ({
            ...acc,
            [`${interval}-${val}`]: orderBy(val, withPercDown),
            [`${interval}-${val}-filtered40`]: orderBy(val, filtered(0.4)),
            [`${interval}-${val}-filtered50`]: orderBy(val, filtered(0.5)),
            [`${interval}-${val}-filtered60`]: orderBy(val, filtered(0.6)),
            [`${interval}-${val}-filtered70`]: orderBy(val, filtered(0.7)),
            [`${interval}-${val}-filtered80`]: orderBy(val, filtered(0.8)),
            [`${interval}-${val}-lowovernightjumps`]: orderBy(val, onlyOvernightDown5),
            [`${interval}-${val}-highovernightjumps`]: orderBy(val, onlyOvernightUp5)
        }), {});

    };


    return {
        ...await analyzeForDowners('10minute'),
        ...await analyzeForDowners('5minute')
    };


};

const constantRisers = {
    name: 'constant-downers',
    trendFilter,
    // run: [77, 242, 309]
};

module.exports = constantRisers;
