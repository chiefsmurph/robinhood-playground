const mongoose = require('mongoose');
const { Schema } = mongoose;
const cacheThis = require('../utils/cache-this');

const schema = new Schema({
    timestamp: { type : Date, default: Date.now, index: true },
    date: { type: String, index: true },
    strategyName: String,
    min: Number,
    picks: [{
        ticker: { type: String, index: true },
        price: Number
    }],
    data: Schema.Types.Mixed,
    keys: Schema.Types.Mixed,
    isRecommended: Schema.Types.Boolean,

    pmsHit: [String],

    // multipliers
    multiplier: Number,
    forPurchaseMultiplier: Number,
    pmAnalysisMultiplier: Number,
    subsetOffsetMultiplier: Number,
    interestingWords: [String],
});

schema.statics.getUniqueDates = async function() {
    const response = await this.distinct('date');
    return response.filter(Boolean).sort((a, b) => new Date(a) - new Date(b));
};

schema.statics.getRecentRecommendations = async function(limit = 100, isRecommended = true) {
    console.log('getting recent', limit);
    return this.find({
        ...isRecommended
            ? {
                isRecommended: true,
                strategyName: /.*(sudden.*drops|rsi).*/i
            } : {
                isRecommended: false
            }
        // timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000 * numDays) }
    }, {
        data: 0
    })
        .sort({ _id: -1 })
        .limit(limit)
        .lean();
};



schema.statics.getRecentPicksForTicker = async function({
    ticker,
    isRecommended = true,
    date,
    limit = 10,
}) {
    return this
        .find(
            {
                // date: (new Date()).toLocaleDateString().split('/').join('-'),
                picks: {
                    $elemMatch: {
                        ticker
                    }
                },
                ...isRecommended 
                    && { isRecommended: true },
                    // : { strategyName: /.*(sudden.*drops|rsi|downer).*/i  },
                
                ...date && { date },
                // timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 10) }
            },
        )
        .sort({ _id: -1 })
        .limit(limit)
        .lean();
};

const Pick = mongoose.model('Pick', schema, 'picks');
module.exports = Pick;