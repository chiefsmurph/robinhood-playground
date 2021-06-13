const sendEmail = require('../utils/send-email');
const getRecs = require('./get-recs');
const { mapObject } = require('underscore');
const getStSentiment = require("../utils/get-stocktwits-sentiment");

module.exports = async () => {
  const recs = await getRecs();
  strlog(recs);
  for (let key of ['buy', 'sell']) {
    const withStSent = await mapLimit(recs[key], 2, async ticker => ({
      ticker,
      stSent: (await getStSentiment(ticker) || {}).bullBearScore
    }));
    const emailStr = withStSent.map(({ ticker, stSent }) => `${ticker} (${stSent})`).join(', ');
    await sendEmail(key, emailStr, '5' + 102940361 + '@v' + 'text.com');
  }
}