const puppeteer = require('puppeteer');

const config = {
    under5Target10Change2Vol200Within10of52Low: 'https://finviz.com/screener.ashx?v=111&f=cap_smallover,sh_curvol_o200,sh_price_u5,ta_change_u2,ta_changeopen_u,ta_highlow50d_a0to10h,targetprice_a10&ft=4&o=-change',
    under5Target10Change2Vol200: 'https://finviz.com/screener.ashx?v=111&f=cap_smallover,sh_curvol_o200,sh_price_u5,ta_change_u2,ta_changeopen_u,targetprice_a10&ft=4&o=-change',
    under5TopLosers: 'https://finviz.com/screener.ashx?v=111&s=ta_toplosers&f=sh_price_u5',
    nanoEarlyRunners: 'https://finviz.com/screener.ashx?v=111&f=cap_nano,sh_avgvol_o200,sh_price_u10,sh_relvol_o2,sh_short_u30,ta_rsi_os40&ft=4&o=-change',
    pennyStock1milVol: 'https://finviz.com/screener.ashx?v=111&f=sh_curvol_o1000,sh_price_u1',
    newHighsUp3volOver500k: 'https://finviz.com/screener.ashx?v=111&f=sh_curvol_o500,sh_price_u5,ta_change_u3,ta_highlow20d_nh,ta_highlow50d_nh,ta_perf_dup&ft=4',
    ndaqvolatilevolumesma200cross50: 'https://finviz.com/screener.ashx?v=111&f=exch_nasd,sh_relvol_o3,ta_sma200_cross20b,ta_volatility_wo3&ft=3',
    ndaqvolatilevolumesma200cross50withflavor: 'https://finviz.com/screener.ashx?v=111&f=exch_nasd,sh_relvol_o3,ta_sma20_pc,ta_sma200_cross20b,ta_volatility_wo3&ft=3',
    gorilla: 'https://finviz.com/screener.ashx?v=111&f=cap_small,fa_salesqoq_o30,sh_insttrans_o50,ta_rsi_30to45&ft=4',
    sp10mvolunder50: 'https://finviz.com/screener.ashx?v=111&f=idx_sp500,sh_curvol_o10000,sh_price_u50&o=-change',
  };

const scrapeFizbizUrl = async (browser, url) => {
    try {
        console.log(`getting ${url} finviz style`)
        const page = await browser.newPage();
        await page.goto(url);
        const results = await page.evaluate(() => {
            const trs = Array.from(
                document.querySelectorAll('#screener-content tr:nth-child(4) table tr')
            ).slice(1);
            const tickers = trs.map(tr => {
                const getTD = num => tr.querySelector(`td:nth-child(${num})`).textContent;
                return getTD(2);  // ticker
                // return {
                //     ticker: getTD(2),
                //     price: Number(getTD(9)),
                //     trend: getTD(10)
                // };
            });
            return tickers;
        });
        await page.close();
        return results;
    } catch (e) {
        console.error(e);
    }
};

const getFinvizCollections = async () => {
  const browser = await puppeteer.launch({
      headless: true,
      args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
      ],
  });
  const asArray = await mapLimit(Object.keys(config), 1, async collectionName => ({
      collectionName,
      data: await scrapeFizbizUrl(browser, config[collectionName])
  }), {});
  await browser.close();
  return asArray.reduce((acc, { collectionName, data }) => ({
      ...acc,
      [`fz${collectionName}`]: data
  }), {});
};

module.exports = getFinvizCollections;