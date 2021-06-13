
const Holds = require('../models/Holds');
module.exports = async () => {
  const doc = await Holds.findOneAndDelete({
    ticker: 'aaaaapl'
  });
  strlog({ doc })
}