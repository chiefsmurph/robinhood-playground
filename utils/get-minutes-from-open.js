module.exports = () => {

    let sixthirty = new Date();
    sixthirty.setHours(9);
    sixthirty.setMinutes(30);
    var now = new Date();
    var diffMs = now - sixthirty;
    var diffMins = diffMs / 60000;
    return Math.round(diffMins);

};
