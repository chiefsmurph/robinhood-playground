const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
    date: { type: String, index: true },
    accountBalance: Number,
    actualBalanceTrend: {
        absolute: Number,
        percentage: Number
    },
    holdReturn: {
        absolute: Number,
        percentage: Number
    },
    sellReturn: {
        absolute: Number,
        percentage: Number
    },
    forPurchasePM: {
        avgTrend: Number,
        weightedTrend: Number,
    },
    pickToExecutionPerc: Number,
    fillPerc: Number,
    indexPrices: {
        sp500: Number,
        nasdaq: Number,
        russell2000: Number
    }
});

schema.statics.getUniqueDates = async function() {
    const response = await this.distinct('date');
    return response.sort((a, b) => new Date(a) - new Date(b));
};

const DayReport = mongoose.model('DayReport', schema, 'dayReports');
module.exports = DayReport;