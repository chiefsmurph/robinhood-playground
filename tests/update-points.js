
const Hold = require('../models/Holds');

export default async () => {
  
  await Hold.updateOne(
    { ticker: 'SNDL' },
    { $inc: { stPoints: Math.round(10) } }
  );
};