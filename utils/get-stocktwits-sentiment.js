const request = require('request-promise');
const { getProxy } = require('./stocktwits');
const { avgArray } = require('./array-math');
const cacheThis = require('./cache-this');
const Pick = require('../models/Pick');
const { wordFlags } = require('../settings');

let fetchCount = 0;

const stReq = cacheThis(
    async url => {
        // console.log({ url })
        try {
            const res = await request({
                url,
                proxy: getProxy()
            });
            return JSON.parse(res);
        } catch (e) {
            strlog({ e })
            console.error(JSON.parse(e.response.body).response.status);
            throw JSON.parse(e.response.body).response;
        } finally {
            fetchCount++;
            await new Promise(resolve => setTimeout(resolve, 2600)); // rate limited
        }
        
    },
    10
);


const stBrackets = {
    bullish: [-12, 15],    // stSent > 130
    neutral: [-9, 10],     // stSent > 70
    bearish: [-7, 7],     // stSent < 70
};

const getStBracket = ({ bullBearScore, bullishCount, bearishCount, totalCount }) => {
    const ratio = bullishCount / (bullishCount + bearishCount);
    const stBracket = (() => {
        if (ratio > 0.88 && totalCount > 18 && bullBearScore > 80) return 'bullish';
        if (ratio < 0.7) return 'bearish';
        return 'neutral';
    })();
    const [lowerLimit, upperLimit] = stBrackets[stBracket];
    return {
        stBracket,
        upperLimit,
        lowerLimit
    };
};
    

module.exports = async (ticker, detailed, maxId) => {
    try {
        ticker = ticker.toUpperCase();
        // console.log({ ticker, detailed }, 'getting stocktwits sent')
        let { messages } = await stReq(`https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json?filter=top${maxId ? `&max=${maxId}`: ''}`);
        // strlog({messages})
        const includesPhrase = str => JSON.stringify(messages.map(m => m.body)).includes(str);

        const dates = await Pick.getUniqueDates();
        const twoDaysAgo = dates[dates.length - 2]  || Date.now() - 1000 * 60 * 60 * 24 * 2;
        const twoDaysAgoTS = (new Date(twoDaysAgo)).getTime();
        const filterMessagesFromTimestamp = timestamp => 
            messages.filter(o => (new Date(o.created_at)).getTime() > timestamp);
        messages = filterMessagesFromTimestamp(twoDaysAgoTS);
        const withSentiment = messages.filter(o => o.entities.sentiment && o.entities.sentiment.basic);

        // console.log(withSentiment.length);
        const withMin = withSentiment.map(o => {
            const min = Math.round((Date.now() - (new Date(o.created_at)).getTime()) / 1000 / 60);
            return {
                ...o,
                min
            };
        });
        const getPoints = (sentiment, min) => {
            // console.log({sentiment, min})
            const sentMultiplier = sentiment === 'Bullish' ? 1 : -1.75;
            const value = Math.max(12 * 60 - min, 5) + 10;
            return value * sentMultiplier;
        };

        const withPoints = withMin.map(o => ({
            ...o,
            points: getPoints(o.entities.sentiment.basic, o.min)
        }));

        // console.log('withMin', withMin.map(o => o.min));
        // console.log('points', withPoints.map(o => o.points));
        const total = withPoints.reduce((acc, { points }) => acc + points, 0);
        const totalCount = messages.length;

        // const countPenalty = (30 - totalCount) * 2;
        const countBonus = totalCount//
        const bullBearScore = Math.round(total / 30) + countBonus;

        // console.log({finalScore, total, countPenalty});


        const getSentiment = s => messages.filter(o => o.entities.sentiment && o.entities.sentiment.basic === s).length;
        let response = {
            bullBearScore,
            totalCount,
            bearishCount: getSentiment('Bearish'),
            bullishCount: getSentiment('Bullish'),

            wordFlags: wordFlags.filter(includesPhrase),
            ...detailed && {
                messages
            }
        };
        response = {
            ...response,
            ...getStBracket(response),
        }
        console.log(`stSent ${ticker}`, response.bullBearScore);
        return response;

        
        
    //     const dates = await Pick.getUniqueDates();
    //     const twoDaysAgo = dates[dates.length - 2];
    //     const twoDaysAgoTS = (new Date(twoDaysAgo)).getTime();
    //     const oneDayAgo = dates[dates.length - 1];
    //     const oneDayAgoTS = (new Date(oneDayAgo)).getTime();
    //     const twoHoursAgoTS = Date.now() - 1000 * 60 * 60 * 2.5;


    //     const filterMessagesFromTimestamp = timestamp => 
    //         messages.filter(o => (new Date(o.created_at)).getTime() > timestamp);

    //     const breakdownsForTimestamp = timestamp => {
    //         console.log('getting rbeakdown for', (new Date(timestamp)).toLocaleString());
    //         const filteredMessages = filterMessagesFromTimestamp(timestamp);
    //         const getSentiment = s => filteredMessages.filter(o => o.entities.sentiment && o.entities.sentiment.basic === s).length;
    //         return {
    //             bullish: getSentiment('Bullish'),
    //             bearish: getSentiment('Bearish')
    //         };
    //     };


    //     console.log({
    //         twoDaysAgoTS: breakdownsForTimestamp(twoDaysAgoTS),
    //         oneDayAgoTS: breakdownsForTimestamp(oneDayAgoTS),
    //         twoHoursAgoTS: breakdownsForTimestamp(twoHoursAgoTS),
    //     });

    //     // console.log('got stocktwits sent', ticker, { totalCount, bearishCount, bullishCount });

    //     // const bullishScore = (bullishCount / totalCount * 100) * 1.75;
    //     // let bullBearScore = (bullishCount - bearishCount) * 10 - bearishCount - (30 - totalCount);
    //     let bullBearScore = (bullishCount * 30) - (bearishCount * 45);
    
    //     let detailedData = {};
    //     // if (detailed && totalCount > 3) {
    //     //     const sentimentUrl = `https://api.stocktwits.com/api/2/symbols/${ticker}/sentiment.json`;
    //     //     const { data: sentimentData } = await stReq(sentimentUrl);
    //     //     const [{ bullish: mostRecentSentiment }] = sentimentData;
    //     //     const withSentiment = avgArray([bullBearScore, mostRecentSentiment]);
    //     //     detailedData = {
    //     //         mostRecentSentiment,
    //     //         withSentiment
    //     //     };
            
    //     //     const volumeUrl = `https://api.stocktwits.com/api/2/symbols/${ticker}/volume.json`;
    //     //     const { data: volumeData } = await stReq(volumeUrl);
    //     //     const [{ volume_change: todayVolumeChange }] = volumeData;
    //     //     const withSentAndVol = avgArray([
    //     //         ...new Array(6).fill(withSentiment),
    //     //         withSentiment * (1 + todayVolumeChange / 8)
    //     //     ]);
    //     //     detailedData = {
    //     //         ...detailedData,
    //     //         todayVolumeChange,
    //     //         withSentAndVol
    //     //     };
    //     // }
        
    //     const returnObj = {
    //         totalCount,
    //         bearishCount,
    //         bullishCount,
    //         bullBearScore,
    //         ...detailedData
    //     };
    //     console.log('STSENT', ticker, returnObj.bullBearScore, '....', fetchCount);
    //     return returnObj;

    } catch (e) {
        console.error(e);
        return {};
    }
    
};