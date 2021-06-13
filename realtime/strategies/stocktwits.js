const getStSentiment = require('../../utils/get-stocktwits-sentiment');

module.exports = {

  postRun: async (picks, todaysPicks, periods) => {
    if (!periods.includes(30)) {
      console.log('not running stocktwits strategy because periods doesnt include 30');
      return;
    }
    const allTickers = picks.map(pick => pick.ticker).uniq();
    console.log({
      stocktwitsPostRunCount: allTickers.length
    });
    if (allTickers.length < 4) {
      console.log('not running stocktwits because allTickers length is less than 4');
      return;
    }
    console.log({allTickers});
    const allStSent = (await mapLimit(allTickers, 3, async ticker => {
      const sent = await getStSentiment(ticker);
      // console.log('huzzah', ticker, sent);
      return {
        ticker,
        ...sent
      };
    })).sort((a, b) => b.bullBearScore - a.bullBearScore);
    const top = allStSent[0];
    const lowest = allStSent[allStSent.length - 1];
    return [
      {
        ticker: top.ticker,
        keys: {
          mostBullish: true
        },
        data: {
          bullBearScore: top.bullBearScore
        }
      },
      {
        ticker: lowest.ticker,
        keys: {
          mostBearish: true
        },
        data: {
          bullBearScore: lowest.bullBearScore
        }
      },
    ];

  },

  pms: {
    mostBullish: 'mostBullish',
    mostBearish: 'mostBearish',
  }
}