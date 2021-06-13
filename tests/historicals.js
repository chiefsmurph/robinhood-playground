const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');
module.exports = async () => {
  strlog(
    await getMultipleHistoricals(
      ['BPMX'],
    )
  )
}