const getMultipleHistoricals = require('../app-actions/get-multiple-historicals');
export default async () => {
  strlog(
    await getMultipleHistoricals(
      ['BPMX'],
    )
  )
}