const mongoose = require('mongoose');

const tokenTransactionsSchema = new mongoose.Schema({
    accountId: String,
    coinId: String,
    amount: String,
    timestamp: Number,
    txId: String,
    from: String,
    to: String,
    action: String,
    status: String,
    version: String
}, { timestamps: true });

const TokenTransactions = mongoose.model('TokenTransactions', tokenTransactionsSchema);

module.exports = TokenTransactions;
