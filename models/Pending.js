const mongoose = require('mongoose');

const pendingSchema = new mongoose.Schema({
    orderId: String,
    type: String,
    input: String,
    cryptoIds: [Number],
    quantitiesInWei: [Number],
    amountInWei: String,
    assets: [],
    coins: [],
    assetId: String
}, { timestamps: true });

const Pending = mongoose.model('Pending', pendingSchema);

module.exports = Pending;
