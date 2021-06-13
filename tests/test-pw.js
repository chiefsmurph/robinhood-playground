const PositionWatcher = require('../utils/PositionWatcher');
module.exports = async (ticker = 'KODK') => {

    new PositionWatcher({ ticker });
    setTimeout(() => {
        console.log('tr that')
    }, 1000 * 60);

    await new Promise(resolve => {
        setTimeout(resolve, 1000 * 60);
    });
};