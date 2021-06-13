const Holds = require('../models/Holds');
const ClosedPositions = require('../models/Holds/ClosedPositions');

module.exports = async (ticker = 'WAFU') => {
  console.log(await (await Holds.findOne({ ticker })).closePosition())
  console.log(ClosedPositions.findOne({ ticker }).lean())
  // const theHold = await Holds.findOneAndUpdate(
  //   { ticker:  'WAFU' },
  //   {
  //     $push: {
  //       sells: {
  //         date: (new Date()).toLocaleDateString().split('/').join('-'),
  //         fillPrice: 100,
  //         quantity: 15
  //       }
  //     }
  //   },
  //   { new: true }
  // );

  // return theHold.toObject();
}