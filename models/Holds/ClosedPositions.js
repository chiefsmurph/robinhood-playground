const mongoose = require('mongoose');
const schema = require('./schema');
const ClosedPosition = mongoose.model('ClosedPositions', schema, 'closedPositions');
module.exports = ClosedPosition;