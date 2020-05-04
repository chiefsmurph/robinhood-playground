const { alpaca } = require('.');
const { force: { keep }, continueDownForDays } = require('../settings');
const sellPosition = require('./sell-position');
const Holds = require('../models/Holds');
const { mapObject, pick } = require('underscore');

const getPositions = require('./get-positions');
const alpacaMarketSell = require('./market-sell');
const alpacaAttemptSell = require('./attempt-sell');
const stratManager = require('../socket-server/strat-manager');
const sendEmail = require('../utils/send-email');

module.exports = async (_, dontAct) => {
    
    let positions = await getPositions();
    positions = positions.filter(({ ticker }) => !keep.includes(ticker));

    if (dontAct) {
        return strlog({ positions });
    }


    await sendEmail(
        'force',
        'acting on positions', 
        JSON.stringify(positions.map(position => pick(position, ['ticker', 'percToSell', 'returnPerc', 'daysOld'])), null, 2)
    );

    Promise.all(
        positions
        .filter(({ wouldBeDayTrade, percToSell }) => !wouldBeDayTrade && percToSell > 0)
            .map(async position => {
                const { ticker, recommendation, daysOld, stBracket, wouldBeDayTrade } = position;

                // if (recommendation === 'average down') {
                //     const realtimeRunner = require('../realtime/RealtimeRunner');
                //     await realtimeRunner.handlePick({
                //       strategyName: 'average-down-recommendation',
                //       ticker,
                //       keys: {
                //         [`${daysOld}daysOld`]: true,
                //         [stBracket]: true,
                //       },
                //       data: { 
                //         position
                //       }
                //     }, true);
                // }

                if (wouldBeDayTrade) return;
                return sellPosition(position);
                
                
            })
    );
};