const getStSent = require('../utils/get-stocktwits-sentiment');
export default async (ticker = 'CHK', quantity = 5) => {

    console.log('starting')
    const run1 = await getStSent('DHC');
    console.log('done')
}