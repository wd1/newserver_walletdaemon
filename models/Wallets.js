const mongoose = require('mongoose');

const walletsSchema = new mongoose.Schema({
    accountId: String,
    coinId: String,
    quantity: String
}, { timestamps: true });

const Wallets = mongoose.model('Wallets', walletsSchema);

module.exports = Wallets;
