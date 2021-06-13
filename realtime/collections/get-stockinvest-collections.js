const puppeteer = require('puppeteer');
const { stockinvestapi } = require('../../config');

const config = {
    topBuys: stockinvestapi.topBuy,
    undervalued: stockinvestapi.undervalued,
};

const scrapeStockInvestUrl = async (browser, url) => {
  console.log(`stock invest scrape: ${url}`)
  const page = await browser.newPage(); 
  await page.goto(url);
  const json = await page.evaluate(() =>
    JSON.parse(document.querySelector("body").innerText)
  );
  await page.close();
  return json
    .slice(0, 50)
    .map(({ ticker }) => ticker);
};

const getStockInvestCollections = async () => {
  const browser = await puppeteer.launch({
      headless: true,
      args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
      ],
  });
  const asArray = await mapLimit(Object.keys(config), 1, async collectionName => ({
      collectionName,
      data: await scrapeStockInvestUrl(browser, config[collectionName])
  }), {});
  await browser.close();
  return asArray.reduce((acc, { collectionName, data }) => ({
      ...acc,
      [`si${collectionName}`]: data
  }), {});
};

module.exports = getStockInvestCollections;
