const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
    timestamp: { type : Date, default: Date.now },
    title: String,
    data: Schema.Types.Mixed
});

schema.statics.getMostRecent = async function(limit = 100) {
    return this
        .find({})
        .sort({ _id: -1 })
        .limit(limit)
        .lean();
}


const Log = mongoose.model('Log', schema, 'logs');
module.exports = Log;