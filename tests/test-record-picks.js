const recordPicks = require('../app-actions/record-picks');

module.exports = async Robinhood => {
    await recordPicks('sudden-drops-hotSt-5min-mediumJump-avgh10-spread3-firstAlert-bullish-brunch', 5000, [
        'FFHL'
    ]);
};