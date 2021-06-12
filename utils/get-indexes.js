const request = require('request-promise');
const cheerio = require('cheerio');
const mapLimit = require('promise-map-limit');
const lookupMultiple = require('./lookup-multiple');
const { mapObject } = require('underscore');
const getBtcPrice = require('../utils/get-btc-price');
const indexes = {
    sp500: 'SPY',
    nasdaq: 'QQQ',
    russell2000: 'IWM',
};

export default async () => {
    const lookups = await lookupMultiple(Object.values(indexes));
    return {
        ...mapObject(indexes, ticker => lookups[ticker]),
        btc: await getBtcPrice()
    };
};