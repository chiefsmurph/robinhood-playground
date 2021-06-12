const sendEmail = require('../utils/send-email');
export default async () => {
  await sendEmail('testing', 'body');
}