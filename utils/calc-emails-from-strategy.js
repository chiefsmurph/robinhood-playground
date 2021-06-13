const flattenEmailObj = require('./flatten-email-obj');
const flatten = require('./flatten-array');

const calcEmailsFromStrategy = async (_, strategy) => {


    
    const emailObj = await flattenEmailObj();

    const emailsToSend = [];
    Object.keys(emailObj).forEach(email => {
        const emailList = emailObj[email];
        emailList.forEach(value => {
            if (typeof value === 'string' && strategy === value) {
                emailsToSend.push({
                    email,
                    pm: null
                });
            } else if (typeof value === 'object' && value.strategies.includes(strategy)) {
                emailsToSend.push({
                    email,
                    pm: value.pm
                });
            }
        });
    });
    return emailsToSend;
};

module.exports = calcEmailsFromStrategy;