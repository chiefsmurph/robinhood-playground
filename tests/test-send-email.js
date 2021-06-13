const sendEmail = require('../utils/send-email');
module.exports = async () => {
  await sendEmail('testing', 'body');
}