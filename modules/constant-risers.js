// utils
const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');
const getTrend = require('../utils/get-trend');
const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');

const trendFilter = async (trend) => {

    const analyzeForRisers = async interval => {

        let allHistoricals = await getMultipleHistoricals(
            trend.map(buy => buy.ticker),
            `interval=${interval}`
        );

        let withHistoricals = trend.map((buy, i) => ({
            ...buy,
            historicals: allHistoricals[i]
        }));

        let withPercUp = withHistoricals
            .map(buy => {
                const { historicals } = buy;
                const percUpHighClose = historicals.filter(({ open_price, close_price, high_price }) => {
                    return [
                        close_price,
                        high_price
                    ].some(price => price > open_price);
                }).length / historicals.length;

                const percUpCloseOnly = buy.historicals.filter(({ open_price, close_price }) => {
                    return close_price > open_price;
                }).length / historicals.length;

                const trendPerc = getTrend(historicals[historicals.length - 1].close_price, historicals[0].open_price);

                return {
                    ...buy,
                    percUpHighClose,
                    percUpHighClosePoints: percUpHighClose * trendPerc,
                    percUpCloseOnly,
                    percUpCloseOnlyPoints: percUpCloseOnly * trendPerc,
                    trendPerc
                };

            })
            .filter(buy => buy.trendPerc > 1)
            .map(buy => {
                delete buy.historicals;
                return buy;
            });

        withPercUp = await addOvernightJumpAndTSO(withPercUp);

        // console.log('with', JSON.stringify(withPercUp, null, 2));
        const orderBy = (what, trend) => {
            return trend
                .sort((a, b) => b[what] - a[what])
                .slice(0, 1)
                .map(buy => buy.ticker);
        };


        const filtered = (ratio) => withPercUp.filter(({ percUpHighClose, percUpCloseOnly }) => {
            return percUpHighClose > ratio && percUpCloseOnly > ratio;
        });

        const onlyOvernightDown5 = withPercUp.filter(buy => buy.overnightJump < -5);
        const onlyOvernightUp5 = withPercUp.filter(buy => buy.overnightJump > 5);

        return [
            'percUpHighClose',
            'percUpCloseOnly',
            'percUpHighClosePoints',
            'percUpCloseOnlyPoints'
        ].reduce((acc, val) => ({
            ...acc,
            [`${interval}-${val}`]: orderBy(val, withPercUp),
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
        ...await analyzeForRisers('10minute'),
        ...await analyzeForRisers('5minute')
    };


};

const constantRisers = {
    name: 'constant-risers',
    trendFilter,
    // run: [40, 80, 100, 140, 198, 250, 300],
};

module.exports = constantRisers;
