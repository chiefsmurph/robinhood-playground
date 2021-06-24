const gmailSend = require('gmail-send');
const { gmail: credentials } = require('../config');
// console.log({credentials })
const send = gmailSend({
  user: credentials.username,
  pass: credentials.password
});

module.exports = (force, subject, text = '', to = credentials.username, files = []) => 
  new Promise((resolve, reject) => {
    console.log('disabled')
    if (force !== 'force') return resolve();
    console.log(`sending email...to ${to}...`);
    console.log('subject', subject, 'text', text.slice(0, 20));
    let html;
    if (text.includes('</')) {
      html = text;
      text = undefined;
    }
    send({
        subject: `rh-playground: ${subject}`,
        text,
        html,
        to,
        files
    }, (err, res) => err 
      ? console.error(err) && resolve() 
      : resolve(res));
  });
