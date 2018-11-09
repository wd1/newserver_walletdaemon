const mongoose = require('mongoose');

const walletsSchema = new mongoose.Schema({
    accountId: String,
    version: String,
    quantity: String
}, { timestamps: true });

const CoinWallets = mongoose.model('CoinWallets', walletsSchema);

module.exports = CoinWallets;
