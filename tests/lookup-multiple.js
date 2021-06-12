const lookupMultiple = require('../utils/lookup-multiple');
export default async (rh) => {
    console.log(
        await lookupMultiple(
            rh, 
            ['AKER', 'BPMX', 'HSGX'],
            true
        )
    )
}