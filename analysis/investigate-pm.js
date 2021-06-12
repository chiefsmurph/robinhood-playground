const Pick = require('../models/Pick');

export default async pm => {
  console.log({ pm })
  const picks = await Pick.find({
    isRecommended: true,
    pmsHit: pm
  }, { data: 0 }).lean();
  strlog({
    picks
  })
};