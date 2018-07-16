const mongoose = require('mongoose');

const ordersSchema = new mongoose.Schema({
    accountId: String,
    coinId: String,
    indexId: String,
    quantity: { type: Number, default: 0.0 },
    amount: { type: Number, default: 0.0 },
    timing: String,
    status: String,
    type: String,
    action: String,
    txId: String,
    timestamp: Number
}, { timestamps: true });

const Orders = mongoose.model('Orders', ordersSchema);

module.exports = Orders;
