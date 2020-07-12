const sumArray = arr => {
    return arr
        .filter(v => v !== undefined)
        .reduce((acc, val) => acc + val, 0);
  };
  
const avgArray = arr => {
    return sumArray(arr) / arr.length;
};

const percUp = arr => arr.filter(v => v > 0).length / arr.length * 100;

const hundredResult = arr =>
    arr.reduce((acc, perc) => acc * (perc / 100 + 1), 100);

// Standard deviation
const standardDeviation = function (data) {
    const m = avgArray(data);
    return Math.sqrt(data.reduce(function (sq, n) {
        return sq + Math.pow(n - m, 2);
    }, 0) / (data.length - 1));
};

const zScore = (arr, val) => {
    const numerator = val - avgArray(arr);
    const denominator = standardDeviation(arr);
    return numerator / denominator;
};

module.exports = {
    sumArray,
    avgArray,
    percUp,
    hundredResult,
    standardDeviation,
    zScore
};
