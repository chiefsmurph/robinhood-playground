const puppeteer = require('puppeteer');

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}

export default async () => {

  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
    ],
  });
  const page = await browser.newPage();
  await page.goto(`https://www.nasdaqtrader.com/trader.aspx?id=TradeHalts`);
  const results = await page.evaluate(() => {
      const trs = Array.from(
          document.querySelectorAll('.genTable tr')
      );
      return trs.map(tr => Array.from(tr.querySelectorAll('td, th')).map(cell => cell.textContent));
  });
  const [headerRow, ...rest] = results;
  const headers = headerRow.map(camelize);
  // strlog({
  //   headers,
  //   rest
  // });

  const response = rest.map(values =>
    values.reduce((acc, value, index) => ({
      ...acc,
      [headers[index]]: value.trim()
    }), {})
  );


  await page.close();
  await browser.close();

  return response;
}