const mongoose = require('mongoose');

const transactionsSchema = new mongoose.Schema({
    orderId: String,
    coinId: String,
    pair: String,
    side: String,
    txnHash: String,
    quantity: { type: Number, default: 0.0 },
    amount: { type: Number, default: 0.0 },
    type: String,
    smallestUnit: String,
    status: String
}, { timestamps: true });

const Transactions = mongoose.model('Transactions', transactionsSchema);

module.exports = Transactions;
