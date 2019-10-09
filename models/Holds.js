const mongoose = require('mongoose');
const { Schema } = mongoose;
const Pick = require('./Pick');

const schema = new Schema({
    ticker: String,
    buys: [{
        date: String,
        fillPrice: Number,
        quantity: Number,
        strategy: String,
        relatedPick: { type: Schema.Types.ObjectId, ref: 'picks' },
        data: Schema.Types.Mixed
    }],
});

schema.statics.registerAlpacaFill = async function(fillData) {
    let {
        ticker,
        alpacaOrder,
        dateStr = (new Date()).toLocaleDateString().split('/').join('-'),
        relatedPick
    } = fillData;
    relatedPick = relatedPick || await Pick.getRecentPickForTicker(ticker);
    strlog({ relatedPick })
    const strategy = relatedPick.strategyName;
    const newBuy = {
        date: dateStr,
        fillPrice: Number(alpacaOrder.filled_avg_price),
        quantity: Number(alpacaOrder.filled_qty),
        strategy,
        relatedPick,
        data: fillData.data
    };
    strlog({ newBuy })
    const HoldDoc = await this.updateOne(
        { ticker },
        { $push: { buys: newBuy } },
        { upsert: true }
    );
    strlog({ HoldDoc });
    return HoldDoc;
};

const Hold = mongoose.model('Hold', schema, 'holds');
module.exports = Hold;