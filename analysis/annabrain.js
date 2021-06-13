const brain = require('brain.js');
const fs = require('mz/fs');
const jsonMgr = require('../utils/json-mgr');
const { avgArray } = require('../utils/array-math');

module.exports = async () => {

    // all picks to object
    
    let allDays = await fs.readdir(`./json/strat-perfs`);

    const getTrendsForFile = async file => {
        const stratPerfsTrend = {};
        const obj = await jsonMgr.get(`./json/strat-perfs/${file}`);
        if (!obj['next-day-9']) return null;
        obj['next-day-9'].forEach(({ strategyName, avgTrend }) => {
            stratPerfsTrend[strategyName] = avgTrend;
        });
        console.log(Object.keys(stratPerfsTrend).length, 'count it')
        return stratPerfsTrend;
    };

    const predictForDays = async (days) => {
        console.log('days', days);
        const stratPerfsTrend = {};
        // console.log(allDays);
        for (let file of days) {
            const obj = await jsonMgr.get(`./json/strat-perfs/${file}`);
            // console.log(strategyName);
            // console.log(file);
            if (!obj['next-day-9']) continue;
            console.log('found', file, obj['next-day-9'].length);
            obj['next-day-9'].forEach(({ strategyName, avgTrend }) => {
                stratPerfsTrend[strategyName] = (stratPerfsTrend[strategyName] || []).concat([avgTrend]);
            });
        }


        const predictStrategy = (trends) => {
            // console.log(strategyName, 'strategy')
            const trainingObjs = (() => {
                const arr = [];
                for (let i = 0; i < trends.length - 1; i++) {
                    arr.push({
                        input: trends.slice(0, i + 1).map(n => Number(n)),
                        output: { outputTrend: [Number(trends[i + 1])] }
                    });
                }
                return arr;
            })();
            
            // console.log(JSON.stringify(trainingObjs, null, 2));
            const net = new brain.NeuralNetwork();
            net.train(trainingObjs);
            const prediction = net.run(trends);
            // console.log(strategyName, 'strategy completed');
            return prediction;
            // var net2 = new brain.NeuralNetwork();
            // net2.train([
            //     { input: { r: 0.03, g: 0.7, b: 0.5 }, output: { black: 1 } },
            //     { input: { r: 0.16, g: 0.09, b: 0.2 }, output: { white: 1 } },
            //     { input: { r: 0.5, g: 0.5, b: 1.0 }, output: { white: 1 } }
            // ]);
        
            // var output = net2.run({ r: 1, g: 0.4, b: 0 }); // { white: 0.99, black: 0.002 }
            // console.log(output);
        };

        const toPredict = Object.keys(stratPerfsTrend)
            // .filter(strategyName => stratPerfsTrend[strategyName].length > 5);


        const myPredictions = toPredict
            .filter(stratName => stratPerfsTrend[stratName].every(trend => trend > 0))
            .map((stratName, i, obj) => {
                const weighted = stratPerfsTrend[stratName]
                    .filter(trend => trend < 80)
                    .map((trend, i) => Array(i).fill(trend))
                    .reduce((a, b) => a.concat(b), [])
                return {
                    stratName,
                    prediction: avgArray(
                        weighted
                    ),
                    trend: weighted
                };
            })
            .sort((a, b) => Number(b.prediction) - Number(a.prediction));
        
        return myPredictions.slice(0, 20).map(pred => pred.stratName);

    };

    for (let [index, day] of allDays.entries()) {
        const sliced = allDays.slice(0, index + 1);
        const lastDay = sliced.pop();
        const predictions = await predictForDays(sliced);
        // console.log('predictions', predictions);
        console.log('last day', lastDay);
        const allTrends = await getTrendsForFile(lastDay);
        // console.log(allTrends, 'allllll')
        if (!allTrends) continue;
        // console.log(allTrends);
        const predictionsWithActual = predictions.map(strategy => {
            const actual = allTrends[strategy];
            !actual && console.log('YOO ACTUAL', strategy);
            return {
                strategy,
                actual
            }
        });
        console.log(predictionsWithActual)
        console.log('avg', avgArray(predictionsWithActual.map(pred => pred.actual).filter(val => !!val)));
        console.log('--------------')
    }
    

    
    // let allPredictions = toPredict
    //     .map((   stratName, i, obj) => {
    //         const { outputTrend: prediction } = predictStrategy(stratPerfsTrend[stratName]);
    //         console.log(`${i+1}/${obj.length} ${stratName}`);
    //         return {
    //             stratName,
    //             prediction,
    //             trend: stratPerfsTrend[stratName]
    //         };
    //     })
    //     .sort((a, b) => Number(b.prediction) - Number(a.prediction));


    // console.log(JSON.stringify(myPredictions, null, 2));
    
};
