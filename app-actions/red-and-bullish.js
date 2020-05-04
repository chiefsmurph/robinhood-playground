const getPositions = require('../alpaca/get-positions');
module.exports = async () => {
  const positions = await getPositions();

  // strlog({ positions });

  const red = positions.filter(({ returnPerc }) => returnPerc < 0);
  const andBullish = red.filter(({ stSent: { stBracket }}) => stBracket === 'bullish');

  // strlog({ andBullish })

  return andBullish;
}