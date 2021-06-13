// npm
const fs = require('mz/fs');

module.exports = async () => {

    // get portfolio value

    // const totalPortfolioValue = ports[0].extended_hours_equity;
    // console.log('user', JSON.stringify(totalPortfolioValue, null, 2));


    const {results: ports} = await Robinhood.url('https://api.robinhood.com/portfolios/');
    // console.log(ports, 'ports');

    let portfolioCache = {};

    let response = await Robinhood.url('https://api.robinhood.com/portfolios/historicals/5SA80442/?span=year&interval=day');
    let {equity_historicals: hist} = response;
    // console.log(response, 'log port val');
    hist = hist.map(h => ({
        ...h,
        date: (() => {
            const d = new Date(h.begins_at);
            d.setDate(d.getDate() + 1);
            return d.toLocaleDateString().split('/').join('-');
        })(),
        close: Number(h.adjusted_close_equity)
    }));

    hist.forEach(h => {
        portfolioCache[h.date] = h.close;
    });

    // log it
    // try {
    //     portfolioCache = JSON.parse(await fs.readFile('./portfolio-cache.json'));
    // } catch (e) {}
    // const dateStr = new Date().toLocaleString();
    // portfolioCache[dateStr] = totalPortfolioValue;

    try {
        await fs.writeFile('./portfolio-cache.json', JSON.stringify(portfolioCache, null, 2));
    } catch (e) {}

};
