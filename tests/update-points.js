
const Hold = require('../models/Holds');

module.exports = async () => {
  
  await Hold.updateOne(
    { ticker: 'SNDL' },
    { $inc: { stPoints: Math.round(10) } }
  );
};