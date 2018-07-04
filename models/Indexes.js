const mongoose = require('mongoose');

const indexesSchema = new mongoose.Schema({
    accountId: String,
    name: String,
    amount: String,
    txId: String,
    timestamp: Number
}, { timestamps: true });

const Indexes = mongoose.model('Indexes', indexesSchema);

module.exports = Indexes;
