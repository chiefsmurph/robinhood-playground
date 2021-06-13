const avgArray = arr => {
    const sum = arr.reduce((acc, val) => acc + val, 0);
    return sum / arr.length;
};
module.exports = avgArray;
