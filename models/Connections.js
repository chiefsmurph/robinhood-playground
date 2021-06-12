const mongoose = require('mongoose');
const { Schema } = mongoose;
const cacheThis = require('../utils/cache-this');

const schema = new Schema({
    site: String,
    ip: { type: String, index: true },
    userAgent: String,
    connect: Date,
    disconnect: Date,
});

const Connection = mongoose.model('Connection', schema, 'connections');
export default Connection;