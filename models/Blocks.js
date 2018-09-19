const mongoose = require('mongoose');

const blocksSchema = new mongoose.Schema({
    number: { type: Number, default: 0 }
}, { timestamps: true });

const Blocks = mongoose.model('Blocks', blocksSchema);

module.exports = Blocks;
