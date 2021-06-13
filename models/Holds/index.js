const mongoose = require('mongoose');
const schema = require('./schema');
const Hold = mongoose.model('Hold', schema, 'holds');
module.exports = Hold;