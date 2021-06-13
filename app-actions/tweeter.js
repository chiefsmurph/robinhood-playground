const Twitter = require('twitter');
const { twitter: config } = require('../config');

const client = new Twitter(config);

module.exports = {
    tweet: async (msg) => {
        client.post('statuses/update', { status: msg });
    }
};
