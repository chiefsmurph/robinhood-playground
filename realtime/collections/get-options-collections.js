const runScan = require('../../scans/base/run-scan');
const getRecentVolume = require('./get-recent-volume');
const puppeteer = require('puppeteer');

const makeUpUpPerms = require('./make-up-up-perms');

const getBarChartOptions = async () => {
  let browser, page;
  try {
      console.log('scraping barchart for options tickers....');
      browser = await puppeteer.launch({ 
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
        ],
      });
      page = await browser.newPage();

      await page.goto(`https://www.barchart.com/options/most-active/stocks`, { waitUntil: 'networkidle2' });
      await page.waitFor(2000);
      console.log('hi ');
      const tickers = await page.evaluate(
        sel => Array.from(document.querySelectorAll(sel)).map(node => node.textContent), 
        `table[data-barchart-table-show-symbol-details] a[data-ng-href*="/stock"]`
      );
      return tickers || [];
  } catch (e) {
    console.log(e)
      return null;
  } finally {
    page && await page.close();
    await browser.close();
  }
};

module.exports = async () => {


  const optionsTickers = [
    'MSFT',
    'AAPL',
    'AMD',
    'GOOG',
    'TSLA',
    'NFLX',
    'SPY',
    'QQQ',
    'GE',
    'NIO',
    'FB',
    'TWTR',
    'SQ',
    'JPM',
    'INTC',
    'SNAP',
    'AMZN',
    'BYND',
    'ROKU',
    'GLD',
    'GOLD'
  ];
  //await getBarChartOptions();
  

  const scan = await runScan({
    tickers: optionsTickers,
    includeStSent: false,
  });
  const allTickers = scan.map(result => result.ticker).uniq();
  
  const recentVolumeLookups = await getRecentVolume(allTickers);

  strlog({ allTickers: allTickers.length });

  const withRecentVolume = scan
    .map(result => ({
      ...result,
      recentVolume: recentVolumeLookups[result.ticker],
    }))
    .sort((a, b) => b.recentVolume.ratio - a.recentVolume.ratio);

  // strlog({
  //   topRatio: withRecentVolume.map(({ ticker, recentVolume }) => ({
  //     ticker,
  //     recentVolume
  //   })).slice(0, 6)
  // });


  const optionsCollections = {
      optionsHighestRecentVolume: 'avgRecentVolume',
      optionsHighestRecentVolumeRatio: 'ratio',
      optionsHighestRecentDollarVolume: 'recentDollarVolume'
  };

  return makeUpUpPerms(
    withRecentVolume,
    optionsCollections
  );



};