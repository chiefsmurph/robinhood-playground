const Hold = require("../models/Holds");

export default async ticker => {
    const theHold = await Hold.find({ ticker });
    return Boolean(theHold.isSelling);
};