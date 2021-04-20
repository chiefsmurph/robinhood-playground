const Hold = require("../models/Holds");

module.exports = async ticker => {
    const theHold = await Hold.find({ ticker });
    return Boolean(theHold.isSelling);
};