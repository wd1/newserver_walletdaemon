const mongoose = require('mongoose');

const indexesSchema = new mongoose.Schema({
    accountId: String,
    name: String,
    status: String
}, { timestamps: true });

const Indexes = mongoose.model('Indexes', indexesSchema);

module.exports = Indexes;
