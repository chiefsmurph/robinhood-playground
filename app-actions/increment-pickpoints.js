const Hold = require('../models/Holds');

const incrementPickPoints = async (ticker, pickPoints, attemptCount = 0) => {
  const { nModified } = await Hold.updateOne(
    { ticker } ,
    { $inc: { pickPoints: Math.round(pickPoints) } }
  );
  const success = Boolean(nModified);
  if (!success) {
    setTimeout(
      () => incrementPickPoints(ticker, pickPoints, attemptCount + 1), 
      1000 * 60 * 5 // 5 minutes
    );
  } else {
    await log(`successfully incremented pick points for ${ticker} on the attempt ${attemptCount}`);
  }
};

export default incrementPickPoints;