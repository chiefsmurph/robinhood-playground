const { sortBy } = require('underscore');
const getMinutesFromOpen = require('../../utils/get-minutes-from-open');

module.exports = {
  disabled: true,
  postRun: (newPicks, todaysPicks, periods) => {
    if (!newPicks || !newPicks.length) return;
    const allPicks = [
      ...todaysPicks,
      newPicks
    ];

    const getMostPickedForPeriod = period => {
      const filteredByPeriod = period
        ? allPicks.filter(
          picks => picks.some(
              pick => pick.period === period
          )
        ) : allPicks;
      const filteredPicks = filteredByPeriod
        .slice(-6).flatten()
        .filter(pick => pick.strategyName !== 'most-picked');
      const allTickers = filteredPicks.map(pick => pick.ticker).uniq();
      const withCount = allTickers.map(ticker => ({
        ticker,
        matches: filteredPicks.filter(pick => pick.ticker === ticker)
      }));
      const sorted = sortBy(withCount, ({ matches }) => matches.length).reverse();
      const top = sorted[0];
      if (top) {
        const min = getMinutesFromOpen();
        return {
          ticker: top.ticker,
          ...period && { period },
          keys: {
            [`min${min}`]: true,
            ...!period && { overall: true }
          },
          data: {
            matches: top.matches,
            min
          }
        }
      }
    };
    console.log({ periods })
    return [
      null,
      ...periods,
    ].map(getMostPickedForPeriod);

    // strlog({ sorted });
    
  },

  pms: {
    '30minute': '30min',
    '10minute': '10min',
    '5minute': '5min',
    'overall': 'overall'
  }
}