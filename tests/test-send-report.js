const stratManager = require('../socket-server/strat-manager');

export default async Robinhood => {
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