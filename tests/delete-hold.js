
const Holds = require('../models/Holds');
export default async () => {
  const doc = await Holds.findOneAndDelete({
    ticker: 'aaaaapl'
  });
  strlog({ doc })
}