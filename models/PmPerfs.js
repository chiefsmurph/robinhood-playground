const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
    date: { type: String, index: true },
    min: Number,
    perfs: [{
        pmName: String,
        avgTrend: Number,
        weightedTrend: Number
    }]
});

schema.statics.getUniqueDates = async function() {
    const response = await this.distinct('date');
    return response.sort((a, b) => new Date(a) - new Date(b));
};

const PmPerfs = mongoose.model('PmPerfs', schema, 'pmPerfs');
module.exports = PmPerfs;