const { alpaca } = require('.');

export default async _ => {
    const account = await alpaca.getAccount();
    console.log('Current Account:', account);
    return Number(account.equity) || 1200;
};