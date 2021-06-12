const cacheThis = require('./cache-this');
const getNonZero = require('../app-actions/detailed-non-zero');

export default cacheThis(
    async () => await getNonZero(),
    10// 10 min
);