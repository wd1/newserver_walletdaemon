const mongoose = require('mongoose');

const assetsSchema = new mongoose.Schema({
    accountId: String,
    coinId: String,
    quantity: { type: Number, default: 0.0 },
    amount: { type: Number, default: 0.0 },
    orderType: String,
    txHash: String
}, { timestamps: true });

const Assets = mongoose.model('Assets', assetsSchema);

module.exports = Assets;
