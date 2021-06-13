let googleNewsAPI = require("google-news-json");
const { wordFlags } = require('../settings');

const cacheThis = require('./cache-this');

const promiseTimeout = function(ms, promise){

  // Create a promise that rejects in <ms> milliseconds
  let timeout = new Promise((resolve, reject) => {
    let id = setTimeout(() => {
      clearTimeout(id);
      reject('Timed out in '+ ms + 'ms.')
    }, ms)
  })

  // Returns a race between our timeout and the passed in promise
  return Promise.race([
    promise,
    timeout
  ])
}

module.exports = cacheThis(async (ticker, daysBack = 2) => { 
  let items; 
  try {
    const news = await promiseTimeout(3000, googleNewsAPI.getNews(googleNewsAPI.SEARCH, ticker, "en-US").catch(e => {
      console.log('error', e);
      return {};
    }));
    items = news.items || [];
  } catch (e) {
    items = [];
  }
  
  const daysBackInMs = 1000 * 60 * 60 * 24 * daysBack;
  const recentNews = items
    .filter(result => result.created > Date.now() - daysBackInMs)
    .filter(result => result.title.includes(ticker.toUpperCase()))
    .sort((a, b) => b.created - a.created);

  // strlog({ recentNews });
  const str = JSON.stringify(recentNews).toLowerCase();

  console.log(`found ${recentNews.length} recent news articles for ${ticker}`);
  return {
    recentNews: recentNews.slice(0, 6),
    wordFlags: wordFlags
      .filter(word => str.includes(word))
      .map(word => ['gnews', word].join(''))
  };
}, 90);