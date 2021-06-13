const puppeteer = require('puppeteer');
const regCronIncAfterSixThirty = require('../../utils/reg-cron-after-630');
const filterByTradeable = require('../../utils/filter-by-tradeable');

const recordPicks = require('../../app-actions/record-picks');
const purchaseStocks = require('../../app-actions/purchase-stocks');


const FIZBIZ = require('./fizbiz');
const STOCKINVEST = require('./stockinvest');

const scrapesToRun = {
    fizbiz: FIZBIZ,
    stockinvest: STOCKINVEST
};

const allScrapeModules = Object.keys(scrapesToRun)
    .map(scrapeName => {
        const { config, scrapeFn } = scrapesToRun[scrapeName];
        return {
            name: scrapeName,
            run: config.RUN,
            fn: async (min) => {
                console.log(`running ${scrapeName}-scrapes`);
                const browser = await puppeteer.launch({headless: true });
                const queries = Object.keys(config.QUERIES);
                for (let queryName of queries) {
                    console.log(queryName);
                    const queryPicks = await scrapeFn(browser, config.QUERIES[queryName]);
                    const tradeablePicks = filterByTradeable(queryPicks).slice(0, 15);
                    const strategyName = `${scrapeName}-${queryName}`;
                    // console.log(queryName, queryPicks);
                    await recordPicks(strategyName, min, tradeablePicks);
                    await recordPicks(`${strategyName}-first1`, min, tradeablePicks.slice(0, 1));
                }
                await browser.close();
            }
        }
    })


module.exports = allScrapeModules;