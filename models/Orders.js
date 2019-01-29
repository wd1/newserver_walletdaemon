const mongoose = require('mongoose');

const ordersSchema = new mongoose.Schema({
    accountId: String,
    assetId: String,
    coinId: String,
    indexId: String,
    price: { type: Number, default: 0.0 },
    quantity: { type: Number, default: 0.0 },
    amount: { type: Number, default: 0.0 },
    timing: String,
    status: String,
    type: String,
    action: String,
    receipt: {
        contractAddress: String,
        cumulativeGasUsed: { type: Number, default: 0.0 },
        gasUsed: { type: Number, default: 0.0 },
        from: String,
        to: String,
        status: String,
        transactionHash: String,
        blockHash: String,
        blockNumber: { type: Number, default: 0 },
        timestamp: { type: Number, default: 0 }
    },
    txId: String,
    assets: [{
        symbol: String,
        percent: { type: Number, default: 0 },
        price: { type: Number, default: 0 },
        quantity: { type: Number, default: 0 }
    }],
    inputHash: String,    // keccak256 hash (web3.utils.soliditySha3) of input params (beneficiary, coinIds, amounts, isCoin)
    queryId: String,
    timestamp: Number
}, { timestamps: true });

const Orders = mongoose.model('Orders', ordersSchema);

module.exports = Orders;
