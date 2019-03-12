const mongoose = require('mongoose');

const tradeCoinsSchema = new mongoose.Schema({
    symbolID: { type: Number, unique: true },
    symbol: { type: String, unique: true },
    smallestUnitName: { type: String },
    limit: { type: Number, default: 18 },
    enabled: { type: String }
}, { timestamps: true });

const TradeCoins = mongoose.model('TradeCoins', tradeCoinsSchema);

module.exports = TradeCoins;
