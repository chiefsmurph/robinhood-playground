// npm
const mapLimit = require('promise-map-limit');
const getStSentiment = require('../utils/get-stocktwits-sentiment');
const retryPromise = require('../utils/retry-promise');
const addFundamentals = require('../app-actions/add-fundamentals');

const request = require('request-promise');
const getTrendSinceOpen = require('../rh-actions/get-trend-since-open');

const fieldSorter = (fields) => (a, b) => fields.map(o => {
    let dir = 1;
    if (o[0] === '-') { dir = -1; o=o.substring(1); }
    return a[o] > b[o] ? dir : a[o] < b[o] ? -(dir) : 0;
}).reduce((p, n) => p ? p : n, 0);

module.exports = {
    name: 'best-st-sentiment',
    trendFilter: async (trend, min, priceKey) => {

        let stReqCount = 0;

        // helper fns
        const limitTrendByVolume = async (subTrend, countLimit = 16) => {
            let withFundamentals = await addFundamentals(subTrend);
            // console.log(withFundamentals)
            withFundamentals = withFundamentals
                .filter(o => 
                    o.fundamentals && o.fundamentals.volume && o.fundamentals.average_volume_2_weeks
                );
            console.log(withFundamentals.length, 'before')
            // withFundamentals = withFundamentals.filter(o => Math.abs(o.trend_since_prev_close) < 2.5);
            // console.log(withFundamentals.length, 'trend2')
            withFundamentals = withFundamentals
                .map(o => ({
                    ...o,
                    volToAvg: Number(o.fundamentals.volume) / Number(o.fundamentals.average_volume_2_weeks),
                    volume: o.fundamentals.volume
                }))
            withFundamentals = withFundamentals.filter(o => o.volume > 80000);
            console.log(withFundamentals.length, 'volume gt 80k')
            
            // str({ withFundamentals })
            
            const response = [];
            [
                'volToAvg',  
                'volume'
            ].forEach((sortKey, i) => {
                const sorted = withFundamentals
                    .sort((a, b) => b[sortKey] - a[sortKey])
                    .filter(pos => Boolean(pos[sortKey]));
                // str({ sortKey, sorted })
                let t = 0;
                while (t < sorted.length && response.length < Math.floor(countLimit / 2 * (i + 1))) {
                    const stock = sorted[t];
                    if (stock && response.find(obj => obj && obj.ticker === stock.ticker) === undefined) {
                        response.push(stock);
                    }
                    t++;
                }
                console.log('done', sortKey);
                str({ response: response.map(r => r.ticker) });
            });
            return response;

            // return withFundamentals.sort((a, b) => b.volume - a.volume).slice(0, countLimit);
        };

        const addSentimentToTrend = async trend => {
            const trendTicks = trend.map(o => o.ticker);
            console.log(trendTicks.length);
            console.log([...new Set(trendTicks)].length);

            let withSentiment = await mapLimit(trend, 1, async obj => {
                stReqCount = stReqCount + 1;
                console.log({ stReqCount });
                return {
                    ...obj,
                    ...await getStSentiment(null, obj.ticker)
                };
            });

            // console.log(withSentiment);

            return withSentiment;
        };

        const sortedByGenerator = withSentiment => 
            (key, order, count = 1, filterFn = () => true) => {

                const keyStr = `${order === 'highest' ? '-' : ''}${key}`;
                const sortFn = fieldSorter([keyStr, '-volToAvg'])

                return withSentiment
                    .slice(0)
                    .filter(o => typeof o[key] !== 'undefined')
                    .filter(filterFn)
                    .sort(sortFn)
                    .slice(0, count)
                    .map(o => o.ticker);
            };



        // start

        console.log('running best st-sentiment strategy', priceKey);

        const limitedByVolume = await limitTrendByVolume(trend);
        // console.log(' done done o')
        // str({ limitedByVolume })
        const withSentimented = (await addSentimentToTrend(limitedByVolume))
            .filter(o => o.bullBearScore);
        str({ withSentimented })
        const sortedByFn = sortedByGenerator(withSentimented);

        const highestKeys = [
            'bullBearScore', 
            // 'withSentiment', 
            // 'withSentAndVol', 
            // 'mostRecentSentiment', 
            // 'todayVolumeChange', 
            'bearishCount', 
            'bullishCount'
        ];
        const trendPerms = {
            '': undefined,
            tscPosLt2pt5: o => o.trend_since_prev_close < 2.5 && o.trend_since_prev_close > 0,
            tscLt2pt5: o => Math.abs(o.trend_since_prev_close) < 2.5,
        };
        const handleTrendPerm = (trendPermKey, trendPermFn) => {
            trendPermKey = trendPermKey ? trendPermKey + '-' : trendPermKey;
            return highestKeys.reduce((acc, key) => ({
                ...acc,
                [`${trendPermKey}highest-${key}`]: sortedByFn(key, 'highest', undefined, trendPermFn),
                [`${trendPermKey}lowest-${key}`]: sortedByFn(key, 'lowest', undefined, trendPermFn),
                [`${trendPermKey}highest-${key}-first2`]: sortedByFn(key, 'highest', 2, trendPermFn),
                [`${trendPermKey}lowest-${key}-first2`]: sortedByFn(key, 'lowest', 2, trendPermFn),
            }), {});
        };
        const returnObj = Object.keys(trendPerms).reduce((acc, key) => ({
            ...acc,
            ...handleTrendPerm(key, trendPerms[key])
        }), {});
        

        console.log(JSON.stringify(returnObj, null, 2));
        console.log(`total stocktwits requests: ${stReqCount}`);
        return returnObj;
        
    },
    run: [-25, 80, 130, 190, 270],
    trendFilterKey: ['under5', 'sp500', 'top100RH']
};