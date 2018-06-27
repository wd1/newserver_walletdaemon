const mongoose = require('mongoose');

const tokenTransactionsSchema = new mongoose.Schema({
    accountId: String,
    coinId: String,
    amount: Number,
    timestamp: Number,
    txId: String,
    from: String,
    to: String,
    action: String
}, { timestamps: true });

const TokenTransactions = mongoose.model('TokenTransactions', tokenTransactionsSchema);

module.exports = TokenTransactions;
