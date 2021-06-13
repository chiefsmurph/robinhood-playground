// app-actions
const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');

// npm
const mapLimit = require('promise-map-limit');

// rh-actions
const getRisk = require('../rh-actions/get-risk');
// const trendingUp = require('../rh-actions/trending-up');

const trendFilter = async (trend) => {
    // going up at least 3%

    console.log('running low-float-high-volume strategy');

    console.log('total trend stocks', trend.length);

    let withTrendSinceOpen = await addOvernightJumpAndTSO(trend);
    withTrendSinceOpen = withTrendSinceOpen
        .filter(buy => buy.trendSinceOpen)
        .sort((a, b) => a.trendSinceOpen - b.trendSinceOpen);

    withTrendSinceOpen = withTrendSinceOpen
        .map(buy => {
            const { fundamentals } = buy;
            if (!fundamentals) return buy;
            const {
                shares_outstanding,
                market_cap,
                volume,
                average_volume,
                average_volume_2_weeks
            } = fundamentals;
            const sharesToCap = shares_outstanding / market_cap;    // "float"
            return {
                ...buy,
                sharesToCap,
                volumetoavg: volume / average_volume,
                volumeto2weekavg: volume / average_volume_2_weeks,
                twoweekvolumetoavg: average_volume_2_weeks / average_volume,
                absvolume: Number(volume),
                floatToVolume: sharesToCap / volume,
            };
        })
        .filter(buy => !!buy.sharesToCap);

    const addPoints = (ptKey, sort) => {
        const sortFn = typeof sort === 'string' ? (a, b) => b[sort] - a[sort] : sort;
        return withTrendSinceOpen
            .sort(sortFn)
            .map((buy, index, array) => {
                const relPoints = (array.length - index) / array.length;
                return {
                    ...buy,
                    [ptKey]: relPoints,
                    ...(buy.floatPoints && {
                        [`floatTimes${ptKey}`]: buy.floatPoints * relPoints
                    })
                };
            });
    };

    withTrendSinceOpen = addPoints('floatPoints', (a, b) => a.sharesToCap - b.sharesToCap); // assumption: low float is better
    withTrendSinceOpen = addPoints('absVolPoints', 'absvolume');
    withTrendSinceOpen = addPoints('volToAvgPoints', 'volumetoavg');
    withTrendSinceOpen = addPoints('volTo2WeekPoints', 'volumeto2weekavg');
    withTrendSinceOpen = addPoints('twoWeekVolToAvgPoints', 'twoweekvolumetoavg');
    withTrendSinceOpen = addPoints('floatToVolume', 'floatToVolume');

    console.log('got trend since open')

    // console.log(JSON.stringify(withTrendSinceOpen, null, 2));

    let baseKeys = Object.keys(withTrendSinceOpen[0])
        .filter(key => ['floatTimes', 'Points'].some(str => key.includes(str)));
    // console.log('baseKeys', baseKeys);
    // let baseKeys = [
    //     'sharesToCap',
    //     'volumetoavg',
    //     'volumeto2weekavg',
    //     'twoweekvolumetoavg',
    //     'absvolume',
    //     'floatToVolume',
    //     'floatPoints',
    //     'absVolPoints',
    //     'floatTimesabsVolPoints',
    //     'volToAvgPoints',
    //     'floatTimesvolToAvgPoints',
    //     'volTo2WeekPoints',
    //     'floatTimesvolTo2WeekPoints',
    //     'twoWeekVolToAvgPoints',
    //     'floatTimestwoWeekVolToAvgPoints',
    //     'floatTimesfloatToVolume'
    // ];

    let returnObj = {};
    const riskCache = {};
    for (let key of baseKeys) {

        // console.log('key', key);
        const sortTrend = (
            [
                min = Number.NEGATIVE_INFINITY,
                max = Number.POSITIVE_INFINITY
            ] = [undefined, undefined]
        ) => {
            return withTrendSinceOpen
                .filter(({ trendSinceOpen }) => {
                    return trendSinceOpen >= min && trendSinceOpen < max;
                })
                .sort((a, b) => b[key] - a[key]);
        };

        const processTrend = async (trendKey, limits) => {
            console.log('processing', trendKey);
            const sorted = sortTrend(limits);
            // console.log('sorted');
            // console.log(sorted[0]);
            const watchouts = {};
            for (let obj of sorted) {
                const { ticker } = obj;
                const risk = riskCache[ticker] ? riskCache[ticker] : await getRisk({ ticker });
                riskCache[ticker] = risk;
                if (risk.shouldWatchout && !watchouts.should) {
                    watchouts.should = ticker;
                } else if (!risk.shouldWatchout && !watchouts.not) {
                    watchouts.not = ticker;
                }
                if (watchouts.should && watchouts.not) {
                    break;
                }
            };
            const base = `${key}${trendKey ? `-trend${trendKey}` : ''}`;
            return {
                ...sorted[0] && { [base]: [sorted[0].ticker] },
                ...watchouts.not && { [`${base}-notWatchout`]: [watchouts.not] },
                ...watchouts.should && { [`${base}-shouldWatchout`]: [watchouts.should] },
            };
        };

        const trendPerms = [
            [undefined, undefined], // unfiltered by trendsinceopen
            ['3to5', [3, 5]],
            ['5to10', [5, 10]],
            ['10to15', [10, 15]],
            ['15to25', [15, 25]],
            ['gt5', [5, undefined]],
            ['gt10', [10, undefined]],
            ['gt20', [20, undefined]],
            ['gt30', [30, undefined]],
            ['gt40', [40, undefined]],
            ['gt50', [50, undefined]],
            ['up1to3', [1, 3]],
            ['up0to1', [0, 1]],
            ['down1to3', [-3, -1]],
            ['down3to10', [-10, -3]],
            ['down3to5', [-5, -3]],
            ['down5to7', [-7, -5]],
            ['down7to10', [-10, -7]],
            ['downgt10', [undefined, -10]],
            ['downgt20', [undefined, -20]],
            ['downgt30', [undefined, -30]],
        ];
        for (let [trendKey, limits] of trendPerms) {
            returnObj = {
                ...returnObj,
                ...await processTrend(trendKey, limits)
            };
        }
        // console.log(returnObj, 'returnObj')
    }
    return returnObj;
};

const lowFloatHighVolume = {
    name: 'low-float-high-volume',
    trendFilter,
    // run: [-23, -10, 6, 25, 95, 150, 210, 276, 315, 384], 
            
};

module.exports = lowFloatHighVolume;
