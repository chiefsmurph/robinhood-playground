


const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
    time : { type : Date, default: Date.now },
    accountBalance: Number,
    alpacaBalance: Number,
    indexPrices: {
        sp500: Number,
        nasdaq: Number,
        russell2000: Number,
        btc: Number
    },
    isRegularHours: Boolean,
});

const BalanceReport = mongoose.model('BalanceReport', schema, 'balanceReport');
export default BalanceReport;