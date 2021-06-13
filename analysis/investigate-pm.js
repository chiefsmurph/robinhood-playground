const Pick = require('../models/Pick');

module.exports = async pm => {
  console.log({ pm })
  const picks = await Pick.find({
    isRecommended: true,
    pmsHit: pm
  }, { data: 0 }).lean();
  strlog({
    picks
  })
};