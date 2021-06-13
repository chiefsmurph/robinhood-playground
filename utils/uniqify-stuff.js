const stringSimilarity = require('string-similarity');

const uniqifyArray = (array, strength = 0.85) => {
    return array
        .reduce((acc, val) => {
            const shouldInclude = acc.every(strat => {
                return stringSimilarity.compareTwoStrings(strat, val) < strength;
            });
            return shouldInclude ? acc.concat(val) : acc;
        }, []);
};

const uniqifyArrayOfStrategies = (array, strength = 0.99) => {
    
    const trendCache = {};

    if (!Array.isArray(array) || !array.length) return [];

    const keysToCheck = [
        'name',
        'strategy',
        'trends',
        'maxs',
        // 'count'
    ].filter(k => Object.keys(array[0]).includes(k))
    console.log('keystocheck', keysToCheck);
    return array
        .reduce((acc, val) => {
            const foundInTrendCache = !!trendCache[val.trends || val.maxs];
            const shouldInclude = !foundInTrendCache && acc.every(strat => {
                const getSimilarity = (str1, str2) => {
                    str1 = str1.toString();
                    str2 = str2.toString();
                    return JSON.stringify(str1) === JSON.stringify(str2)
                        ? 1
                        : stringSimilarity.compareTwoStrings(str1, str2);
                };

                return keysToCheck.every(key => {
                    if (key === 'name' || key === 'strategy') {
                        const valParts = val[key].split('-');
                        const foundValRatio = valParts.filter(part => strat[key].includes(part)).length / valParts.length;
                        if (foundValRatio >= 0.8) {
                            // console.log('ouch', key, 'foundValRatio', foundValRatio, strat, val)
                            return false;
                        }
                    }
                    const similarity = getSimilarity(strat[key], val[key]);
                    return similarity < strength;
                });

            });

            trendCache[val.trends || val.maxs] = true;
            return shouldInclude ? acc.concat(val) : acc;
        }, []);
};



module.exports = {
    uniqifyArray,
    uniqifyArrayOfStrategies
};
