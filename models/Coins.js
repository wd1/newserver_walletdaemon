const mongoose = require('mongoose');

const coinsSchema = new mongoose.Schema({
    address: { type: String, unique: true },
    name: { type: String, unique: true },
    symbol: { type: String, unique: true },
    totalSupply: { type: Number, default: 0.0 },
    circulatingSupply: { type: Number, default: 0.0 },
    maxSupply: { type: Number, default: 0.0 },
    price: { type: Number, default: 0.0 },
    marketCap: { type: Number, default: 0.0 },
    volume24h: { type: Number, default: 0.0 },
    percentageChange1h: { type: Number, default: 0.0 },
    percentageChange24h: { type: Number, default: 0.0 },
    percentageChange7d: { type: Number, default: 0.0 },
    limit: { type: Number, default: 0 },
    created: Number,
    lastUpdated: Number,
    coinMarketCapId: Number,
    cryptoCompareId: Number,
    image: String
}, { timestamps: true });

const Coins = mongoose.model('Coins', coinsSchema);

module.exports = Coins;
