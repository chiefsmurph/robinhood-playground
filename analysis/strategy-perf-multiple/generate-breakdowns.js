const playoutsOfInterest = require('./one-off-scripts/playouts-of-interest');


const highestPlayoutFn = (
    playoutScoreFn,
    playoutFilter = 'limit'
) => ({
    count,
    playouts,
    ...rest
}) => {
    let max = Number.NEGATIVE_INFINITY;
    let limitName;
    const playoutFilterFn = typeof playoutFilter === 'function'
        ? playoutFilter
        : key => key.includes(playoutFilter)
    Object.keys(playouts)
        .filter(playoutFilterFn)
        .forEach(key => {
            const val = playoutScoreFn(playouts[key], count, rest);
            if (val > max) {
                max = val;
                limitName = key;
            }
        });
    return [max, limitName];    // returns the highest avgTrend limit
};

const runBreakdown = (
    allRoundup,
    {
        scoreFn = ({ count, playouts: { onlyMax: { percUp, avgTrend }}}) =>
            percUp * avgTrend * count,
        filterFn = () => true,
        includeAll = false,
        includePlayout,
    }
) => {
    const filtered = allRoundup.filter(filterFn);
    const withScore = filtered.map(obj => {

        const scoreOutput = scoreFn(obj);
        let score;
        if (Array.isArray(scoreOutput)) {
            includePlayout = scoreOutput[1];
            score = scoreOutput[0];
        } else {
            score = scoreOutput;
        }

        obj = {
            ...obj,
            score
        };

        // remove playouts from obj
        if (includePlayout) {
            return {
                ...obj,
                playouts: {
                    [includePlayout]: obj.playouts[includePlayout]
                }
            };
        } else {
            const { playouts, ...rest } = obj;
            return rest;
        }

    });
    // console.log(withScore, 'withScore');
    const sorted = withScore.sort((a, b) => b.score - a.score);
    return includeAll ? sorted : sorted.slice(0, 15);
};


const max = arr => arr.reduce((max, v) => max >= v ? max : v, -Infinity);
const min = arr => arr.reduce((min, v) => min <= v ? min : v, Infinity);

const generateBreakdownConfigs = allRoundup => {

    const maxCount = max(allRoundup.map(o => o.count));
    // console.log(maxCount, 'maxCount');

    const upperCounts = ({ count }) =>
        // top third
        count > maxCount * 2 / 3;
    const lowCounts = ({ count }) =>
        // lower third
        count < maxCount * 1 / 3 && count >= 2;
    const middleCounts = ({ count }) =>
        // middle third
        count >= maxCount * 1 / 3 && count <= maxCount * 2 / 3;

    return {
        all: {
            includeAll: true,
            includePlayout: 'onlyMax'
        },
        // consistent: {
        //     // top 3 quarters
        //     filterFn: ({ count }) => count >= maxCount / 4,
        //     scoreFn: ({ count, percUp }) => (100 + count) * percUp
        // }),
        // creme: {        // top third count
        //     filterFn: ({ count }) => count > maxCount * 2 / 3,
        // }),
        // moderates: {
        //     minPercUp: 0.90,
        //     filterFn: ({ count }) =>    // middle third count
        //         count <= maxCount * 2 / 3
        //         && count > maxCount / 3,
        //     // dont take count into consideration
        //     scoreFn: ({ percUp, avgMax }) => percUp * avgMax
        // }),
        // occasionals: {  // bottom third count
        //     filterFn: ({ count }) => count <= maxCount / 3
        // }),

        limit5hundredResult: {
            filterFn: upperCounts,
            scoreFn: ({
                playouts: {
                    limit5: { hundredResult }
                }
            }) => hundredResult,
            includePlayout: 'limit5'
        },

        limit5creme: {
            filterFn: upperCounts,
            scoreFn: ({
                count,
                playouts: {
                    limit5: { percUp, avgTrend }
                }
            }) => count * (percUp * 3) * avgTrend,
            includePlayout: 'limit5'
        },

        highestLimitPlayoutsAvgTrend: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(playout => playout.avgTrend)
        },

        highestLimitPlayoutsPercUp: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(playout => playout.percUp)
        },

        highestLimitPlayoutsHundredResult: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(playout => playout.hundredResult)
        },

        highestLimitPlayoutsPercUpCountAvg: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(({ percUp, avgTrend }, count) =>
                count * (percUp * 3) * avgTrend
            )
        },

        highestLimitPlayoutsJohnsSecretRecipe: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(({ hundredResult, percUp, avgTrend, percHitsPositive }) =>
                hundredResult * (2 * percUp) * avgTrend * (2 * percHitsPositive)
            )
        },

        highestLimitPlayoutsJohnsSecretRecipeWithCount: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(({ hundredResult, percUp, avgTrend, percHitsPositive }, count) =>
                hundredResult * (2 * percUp) * avgTrend * (2 * percHitsPositive) * count
            )
        },

        highestLimitPlayoutsAvgTrend: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(({ hundredResult, percUp, avgTrend, percHitsPositive }, count) =>
                hundredResult * (2 * percUp) * avgTrend * (2 * percHitsPositive) * count
            )
        },

        bestFirstGreenAvgTrend: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(({ avgTrend }) => avgTrend, 'firstGreen')
        },

        bestAlwaysLastAvgTrend: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(({ avgTrend }) => avgTrend, 'alwaysLast')
        },

        bestChangeGt2SinceLastAvgTrend: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(({ avgTrend }) => avgTrend, 'changeGt2')
        },

        bestAvgTrendAnyPlayout: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(
                ({ avgTrend }) => avgTrend,
                playoutKey => [
                    'alwaysLast',
                    'onlyMax'
                ].every(compareKey => playoutKey !== compareKey)
            )
        },

        bestAvgTrendPlayoutsOfInterest: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(
                ({ avgTrend }) => avgTrend,
                playoutKey => playoutsOfInterest.includes(playoutKey)
            )
        },

        bestAvgTrendPlayoutsOfInterest: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(
                ({ percUp }) => percUp,
                playoutKey => playoutsOfInterest.includes(playoutKey)
            )
        },


        // middleCounts

        middleCountsJohnsRecipe: {
            filterFn: middleCounts,
            scoreFn: highestPlayoutFn(({ hundredResult, percUp, avgTrend, percHitsPositive }) =>
                hundredResult * (2 * percUp) * avgTrend * (2 * percHitsPositive)
            )
        },

        middleCountsJohnsRecipeNoHundredResult: {
            filterFn: middleCounts,
            scoreFn: highestPlayoutFn(({ hundredResult, percUp, avgTrend, percHitsPositive }) =>
                (2 * percUp) * avgTrend * (2 * percHitsPositive)
            )
        },


        // shorts

        lowestLimitPlayoutsHundredResult: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(({ hundredResult, percUp, avgTrend, percHitsPositive }, count) =>
                -1 * hundredResult
            )
        },

        lowestLimitPlayoutsHundredResultCount: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(({ hundredResult, percUp, avgTrend, percHitsPositive }, count) =>
                -1 * hundredResult * count
            )
        },

        lowestLimitPlayoutsHundredResultPercUp: {
            filterFn: upperCounts,
            scoreFn: highestPlayoutFn(({ hundredResult, percUp, avgTrend, percHitsPositive }, count) =>
                -1 * hundredResult * percUp * count
            )
        },




        // low counts

        lowCountHundredResult: {
            filterFn: lowCounts,
            scoreFn: highestPlayoutFn(({ hundredResult, percUp, avgTrend, percHitsPositive }, count) =>
                hundredResult
            )
        },

        lowCountHundredResultPercUp: {
            filterFn: lowCounts,
            scoreFn: highestPlayoutFn(({ hundredResult, percUp, avgTrend, percHitsPositive }, count) =>
                hundredResult * percUp
            )
        },

        anyCountPerfectos: {
            filterFn: obj => obj.percUp === 1,
            scoreFn: highestPlayoutFn(({ hundredResult, percUp, avgTrend, percHitsPositive }, count) =>
                count * avgTrend
            ),
            includeAll: true
        },

        // magicScoreFns
        // this breakdown takes into consideration avgTrend, lowestMax and count

        ...(() => {

            const top2thirds = ({ count }) => upperCounts({ count }) || middleCounts({ count });

            const magicScoreFn = highestPlayoutFn((playout, count, rest) => {
                // console.log(playout, 'playout', 'rest', rest);
                const { maxs } = rest;
                const lowestMax = Math.min(...maxs);
                const numBelow0 = maxs.filter(val => val <= 0).length;
                return (
                    (playout.avgTrend * (playout.percUp * 2))
                    // + (count / (Math.max(10 - countStrength, 1)))
                ) + ((lowestMax - numBelow0) * 2);
            });

            return {
                upperCountMagicScore: {
                    filterFn: upperCounts,
                    scoreFn: magicScoreFn
                },
                middleCountMagicScore: {
                    filterFn: middleCounts,
                    scoreFn: magicScoreFn
                },
                topTwoThirdsMagicScore: {
                    filterFn: top2thirds,
                    scoreFn: magicScoreFn
                },
                lowThirdMagicScore: {
                    filterFn: lowCounts,
                    scoreFn: magicScoreFn
                },
                lowThirdMinCount5MagicScore: {
                    filterFn: ({ count }) => lowCounts({ count }) && count >= 5,
                    scoreFn: magicScoreFn
                },
                customCount3to5MagicScore: {
                    filterFn: ({ count }) => count >= 3 && count < 5,
                    scoreFn: magicScoreFn
                },
                customCount5to8MagicScore: {
                    filterFn: ({ count }) => count >= 5 && count < 8,
                    scoreFn: magicScoreFn
                },
                customCount8to11MagicScore: {
                    filterFn: ({ count }) => count >= 8 && count < 11,
                    scoreFn: magicScoreFn
                },
                customCount11to14MagicScore: {
                    filterFn: ({ count }) => count >= 11 && count < 14,
                    scoreFn: magicScoreFn
                }
            };

        })()

    }

};

const analyzeRoundup = allRoundup => {
    // console.log('all round', JSON.stringify(allRoundup, null, 2))

    const breakdownConfigs = generateBreakdownConfigs(allRoundup);

    const runAllBreakdowns = () => {
        return Object.keys(breakdownConfigs).reduce((acc, key, i) => {
            console.log('running ', key, 'breakdown');
            console.log(i + 1, '/', Object.keys(breakdownConfigs).length);
            return {
                ...acc,
                [key]: runBreakdown(allRoundup, breakdownConfigs[key])
            };
        }, {});
    };

    return runAllBreakdowns();

};


module.exports = {
    analyzeRoundup,
    runBreakdown,
    highestPlayoutFn,
    generateBreakdownConfigs
};
