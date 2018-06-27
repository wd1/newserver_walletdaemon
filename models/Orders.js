const mongoose = require('mongoose');

const ordersSchema = new mongoose.Schema({
    accountId: String,
    assetId: String,
    price: Number,
    quantity: Number,
    status: String,
    type: String
}, { timestamps: true });

const Orders = mongoose.model('Orders', ordersSchema);

module.exports = Orders;
