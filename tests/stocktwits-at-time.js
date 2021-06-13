const getStSent = require('../utils/get-stocktwits-sentiment');

module.exports = async (ticker, time = '12/13/2019, 6:40:06 AM') => {

  console.log(`finding stSent for ${ticker} at ${(new Date(time)).toLocaleString()}`)
  let lastId;
  let allMessages = [];
  let messageBefore;

  while (!messageBefore) {
    allMessages = [
      ...allMessages,
      ...(await getStSent(ticker, true, lastId)).messages
    ];
    lastId = allMessages[allMessages.length - 1].id;
    messageBefore = allMessages.find(message => (new Date(message.created_at).getTime() < (new Date(time).getTime())))
    strlog({
      messageBefore,
      lastMessageTime: (new Date(allMessages[allMessages.length - 1].created_at)).toLocaleString()
    })
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return getStSent(ticker, false, messageBefore.id)
};