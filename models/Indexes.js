const mongoose = require('mongoose');

const indexesSchema = new mongoose.Schema({
    accountId: String,
    name: String,
    amount: String,
    assets: [{
        coinId: String,
        percentage: { type: Number, default: 0.0 },
        quantity: { type: Number, default: 0.0 },
        amount: { type: Number, default: 0.0 }
    }],
    txId: [String],
    timestamp: Number,
    confirmed: { type: Boolean, default: false }
}, { timestamps: true });

const Indexes = mongoose.model('Indexes', indexesSchema);

module.exports = Indexes;
