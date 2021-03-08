const mongoose = require('mongoose');
const { Schema } = mongoose;
const Pick = require('./Pick');

const schema = new Schema({
    timestamp: { type : Date, default: Date.now },
    title: String,
    data: Schema.Types.Mixed
});

schema.statics.getMostRecent = async function(limit = 100) {

    const recentDates = await Pick.getUniqueDates();
    const date = recentDates[recentDates.length - 2];
    // console.log('getMostRecent', { date })
    const d = new Date(date);
    d.setHours(0);
    d.setMinutes(0);

    return this
        .find({
            timestamp: {
                $gt: d
            }
        })
        .sort({ _id: -1 })
        .lean();
};


schema.statics.boughtToday = async function(ticker) {

    const d = new Date();
    d.setHours(0);
    d.setMinutes(0);

    return Boolean(
        await this.countDocuments({
            title: new RegExp(`^buying ${ticker}`),
            timestamp: {
                $gt: d
            }
        })
    );
};


schema.statics.scannedToday = async function(ticker) {
    const d = new Date();
    d.setHours(0);
    d.setMinutes(0);
    const docs = await this.find({
        title: new RegExp(`just scanned`),
        timestamp: {
            $gt: d
        }
    }).lean();
    const uniqTickers = [...new Set(docs.map(d => d.data.tickers).flat().filter(Boolean))];
    return uniqTickers;
};

const Log = mongoose.model('Log', schema, 'logs');
module.exports = Log;