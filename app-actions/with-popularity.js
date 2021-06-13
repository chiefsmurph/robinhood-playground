module.exports = async (withOvernightJumps) => {
    let i = 1;
    const withPopularity = await mapLimit(withOvernightJumps, 3, async o => {
        const { quote_data, fundamentals } = o;
        const instrument = (quote_data || {}).instrument || (fundamentals || {}).instrument;
        if (!instrument) {
            console.log('no instrument found', o.ticker, o);
        }
        
        const attempt = async () => {
            const response = await Robinhood.url(`${instrument}popularity/`);
            if (response.detail) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                return attempt();
            }
            return response;
        };
        const popularity = await attempt();
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log('about', i, popularity, o.ticker)
        i++;
        return {
            ...o,
            ...instrument ? {
                popularity: popularity.num_open_positions
            } : {}
        };
    });
    str({
        total: withPopularity.filter(o => !!o.popularity).length,
        above1000: withPopularity.filter(o => o.popularity > 1000).length,
        above5000: withPopularity.filter(o => o.popularity > 5000).length,
        above10000: withPopularity.filter(o => o.popularity > 10000).length,
        above500: withPopularity.filter(o => o.popularity > 500).length,
        above100: withPopularity.filter(o => o.popularity > 100).length,
        above400: withPopularity.filter(o => o.popularity > 400).length
    });
    str({ withPopularity })
    return withPopularity;
};