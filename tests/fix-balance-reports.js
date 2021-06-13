const BalanceReport = require('../models/BalanceReport');

module.exports = async (date) => {
  if (!date) return console.log('send a date to delete');

  const reports = await BalanceReport.find({}).sort({ _id: -1 }).limit(10000).lean();
  const withDate = reports.map(r => ({
    ...r,
    date: (new Date(r.time)).toLocaleDateString()
  }));

  const matchingDate = withDate.filter(r => r.date === date);

  strlog({
    withDate,
    firstDate: withDate.slice().reverse()[0].date,
    matchingDate: matchingDate.length
  });

  // return;

  const response = await BalanceReport.deleteMany({
    _id: {
      $in: matchingDate.map(r => r._id)
    }
  });

  strlog({ response });
};