const lookupMultiple = require('../utils/lookup-multiple');
module.exports = async (rh) => {
    console.log(
        await lookupMultiple(
            rh, 
            ['AKER', 'BPMX', 'HSGX'],
            true
        )
    )
}