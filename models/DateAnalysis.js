const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
    date: { type: String, index: true },
    closed: Boolean,

    // dollars
    totalBought: Number,
    totalImpact: Number,

    // percentages
    percChange: Number,
    avgPositionImpactPerc: Number,
    avgPickImpactPerc: Number,
    avgMultiplierImpactPerc: Number,

    // counts
    totalPositions: Number,
    totalPicks: Number,
    totalMultipliers: Number,
});

const DateAnalysis = mongoose.model('DateAnalysis', schema, 'dateAnalysis');
module.exports = DateAnalysis;