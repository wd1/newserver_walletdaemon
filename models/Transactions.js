const mongoose = require('mongoose');

const transactionsSchema = new mongoose.Schema({
    orderId: String,
    blockHash: String,
    blockNumber: Number,
    contractAddress: String,
    cumulativeGasUsed: Number,
    gasUsed: Number,
    from: String,
    to: String,
    status: String,
    transactionHash: String,
    transactionIndex: Number
}, { timestamps: true });

const Transactions = mongoose.model('Transactions', transactionsSchema);

module.exports = Transactions;
