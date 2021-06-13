let i = 0;

module.exports = {
  collections: [
    // 'options',
    'options',
    // 'oneToTwo',
  ],
  period: [
    30
  ],
  handler: () => {
    i++;
    console.log('baseline', i);
    const isIncremental = Boolean(i % 40 === 0);
    const isRandom = Boolean(Math.random() > 0.88);
    return {
      keys: {
        isIncremental,
        isRandom
      }
    };

  }
}