module.exports = (ticker = 'SGBC', amt = 42) => require('../models/Holds').updateOne(
  { ticker } ,
  { $inc: { pickPoints: amt } }
);