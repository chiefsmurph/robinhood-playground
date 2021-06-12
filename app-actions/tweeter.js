const Twitter = require('twitter');
const { twitter: config } = require('../config');

const client = new Twitter(config);

export default {
    tweet: async (msg) => {
        client.post('statuses/update', { status: msg });
    }
};
