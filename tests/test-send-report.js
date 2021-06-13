const stratManager = require('../socket-server/strat-manager');

module.exports = async Robinhood => {
    await stratManager.init();
    // setTimeout(() => {
        console.log(
            JSON.stringify(
                stratManager.calcPmPerfs(),
                null,
                2
            ),
            'report',
        );
    // }, 60000);
};