const sendEmail = require('../utils/send-email');
const { emails } = require('../config');

module.exports = async () => {
  await sendEmail('force', 'test send email to cell', 'log string', Object.keys(emails)[1]); // cell phone
}