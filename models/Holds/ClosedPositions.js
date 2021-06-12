const mongoose = require('mongoose');
const schema = require('./schema');
const ClosedPosition = mongoose.model('ClosedPositions', schema, 'closedPositions');
export default ClosedPosition;