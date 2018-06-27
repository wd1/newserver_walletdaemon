const mongoose = require('mongoose');

const accountsSchema = new mongoose.Schema({
    userId: String,
    beneficiary: { type: String, unique: true },
    balance: String,
    availableBalance: String
}, { timestamps: true });

const Accounts = mongoose.model('Accounts', accountsSchema);

module.exports = Accounts;
