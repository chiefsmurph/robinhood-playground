const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
    timestamp: { type : Date, default: Date.now },
    date: { type: String, index: true },
    strategyName: String,
    min: Number,
    picks: [{
        ticker: String,
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

schema.statics.getRecentRecommendations = async function() {
    const NUM_DAYS = 3;
    return this.find({ 
        isRecommended: true,
        timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000 * NUM_DAYS) }
    }).lean();
};

schema.statics.getRecentPickForTicker = async function(ticker) {
    const list = await this
        .find(
            {
                // date: (new Date()).toLocaleDateString().split('/').join('-'),
                picks: {
                    $elemMatch: {
                        ticker
                    }
                },
                strategyName: /.*(sudden.*drops|rsi|downer).*/i,
                // isRecommended: true
            },
        )
        .sort({ _id: -1 })
        .limit(1)
        .lean();
    return list[0];
}

const Pick = mongoose.model('Pick', schema, 'picks');
module.exports = Pick;