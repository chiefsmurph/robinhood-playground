const saveJSON = async (fileName, obj) => {
  await fs.writeFile(fileName, JSON.stringify(obj, null, 2));
};

const predictSuddenCount = require('../utils/predict-sudden-count');

export default async (amt) => {
  amt = amt ? Number(amt) : null;
  const predictions = await predictSuddenCount(undefined, -1);
  strlog({ predictions})
  saveJSON('purchase-amt.json', )
};