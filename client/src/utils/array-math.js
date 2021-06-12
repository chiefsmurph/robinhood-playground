export const sumArray = arr => {
  return arr.reduce((acc, val) => acc + val, 0);
};

export const avgArray = arr => {
  return sumArray(arr) / arr.length;
};

export const percUp = arr => {
  // console.log({ arr })
  return arr.filter(v => v > 0).length / arr.length * 100;
}

export const hundredResult = arr =>
  arr.reduce((acc, perc) => acc * (perc / 100 + 1), 100);


// Standard deviation
export const standardDeviation = function (data) {
  const m = avgArray(data);
  return Math.sqrt(data.reduce(function (sq, n) {
    return sq + Math.pow(n - m, 2);
  }, 0) / (data.length - 1));
};

export const zScore = (arr, val) => {
  const numerator = val - avgArray(arr);
  const denominator = standardDeviation(arr);
  return numerator / denominator;
};