const recursiveUrl = async (callUrl) => {

    let allResults = [];
    console.log('recursive url');

    let reqBody = {};
    do {
        console.log('looking at', allResults.length, 'results');
        try {
            reqBody = await Robinhood.url(reqBody.next || callUrl);
        } catch (e) {
            console.log('caught this error', e);
        }

        allResults = allResults.concat(reqBody.results);
    } while (reqBody.next);

    return allResults;
};

module.exports = recursiveUrl;
