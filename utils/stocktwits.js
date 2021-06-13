const DISABLED = false;
const request = require('request-promise');
const { stocktwits: config, proxy: proxyConfig } = require('../config');

const getProxy = host => {
    const { username, password, hosts } = proxyConfig;
    host = host || hosts[Math.floor(hosts.length * Math.random())];
    return `http://${username}:${password}@${host}`;
};

const getToken = async proxy => {
    const options = {
        method: 'POST',
        uri: 'https://stocktwits.com/api/login',
        body: { user_session: { login: config.username , password: config.password }},
        json: true,
        proxy
    };
    const response = await request(options);
    console.log(
        'stocktwits token',
        response.token
    );
    return response.token;
};

const postPublic = async ({ body, sentiment, token, proxy }) => {
    console.log(`stocktwits ${config.username} posting public: "${body}"`, proxy)
    return request({
        method: 'POST',
        uri: 'https://api.stocktwits.com/api/2/messages/create.json',
        headers: {
            'Authorization': `OAuth ${token}`
        },
        formData: {
            body,
            sentiment
        },
        proxy
    });
};

const postToRhRoom = async ({ body, sentiment, proxy }) => {
    console.log(`stocktwits ${config.username} posting to ROOM "${body}" (${sentiment})`, proxy);
    return request({
        method: 'POST',
        uri: 'https://roomapi.stocktwits.com/room/robinhood_playground/message',
        headers: {
            'Authorization': `Bearer ${config.bearerToken}`
        },
        formData: {
            alert: 'false',
            body,
            user_sentiment: sentiment
        },
        proxy
    });
};

const postPublicAndRoom = async (ticker, strategy, sentiment, dontPostPublic) => {
    if (DISABLED) {
        return console.log('stocktwits is disabled');
    }
    const proxy = getProxy();
    const token = await getToken(proxy);
    !dontPostPublic && console.log('public response', await postPublic({ body: `$${ticker} ${sentiment}`, sentiment, token, proxy }) );
    console.log('room response', await postToRhRoom({ body: `$${ticker} ${sentiment} because ${strategy}`, sentiment, token, proxy }) )
};

const postBearish = (ticker, strategy) =>
    postPublicAndRoom(ticker, strategy, 'bearish', true);

const postBullish = (ticker, strategy) =>
    postPublicAndRoom(ticker, strategy, 'bullish', true);   // dont post public

module.exports = {
    getProxy,
    getToken,
    postBearish,
    postBullish
};