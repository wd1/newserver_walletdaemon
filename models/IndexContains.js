const mongoose = require('mongoose');

const indexContainsSchema = new mongoose.Schema({
    indexId: String,
    coinId: String,
    percentage: { type: Number, default: 0.0 },
    quantity: { type: Number, default: 0.0 },
    priceOpen: { type: Number, default: 0.0 },
    priceClose: { type: Number, default: 0.0 }
}, { timestamps: true });

const IndexContains = mongoose.model('IndexContains', indexContainsSchema);

module.exports = IndexContains;
