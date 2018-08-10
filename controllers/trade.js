const schedule = require('node-schedule');
const BigNumber = require('bignumber.js');

const Accounts = require('../models/Accounts');
const Assets = require('../models/Assets');
const Indexes = require('../models/Indexes');
const Wallets = require('../models/Wallets');
const Coins = require('../models/Coins');
const Orders = require('../models/Orders');
const Transactions = require('../models/Transactions');
const Pending = require('../models/Pending');
const IndexContains = require('../models/IndexContains');

const { cryptoIdToSymbol } = require('../services/Config');
const Web3Service = require('../services/Web3Service');
const TruffleService = require('../services/TruffleService');

let updateOrder;

exports.tradeSchedule = () => {
    updateOrder = schedule.scheduleJob('*/2 * * * *', runOrder);
};

exports.cancelTradeSchedule = () => {
    if (updateOrder) {
        updateOrder.cancel();
    }
};

const runOrder = () => {
    Coins.findOne({ symbol: 'COIN' }).lean().exec((err, co) => {
        if (err) {
            console.log('purchaseIndex: Coins.findOne: ', err);
            return;
        }

        if (!co) {
            console.log('*** COIN does not exist in database. ***');
            return;
        }

        Accounts.find().lean().exec((err, accounts) => {
            if (err) {
                console.log('runOrder: Accounts.find: ', err);
                return;
            }

            accounts.forEach(account => {
                Wallets.findOne({ accountId: account._id, coinId: co._id }).lean().exec((err, wallet) => {
                    if (err) {
                        console.log('runOrder: Wallets.findOne: ', err);
                        return;
                    }

                    if (!wallet || wallet.quantity * co.price < 5) return;

                    Orders.find({ accountId: account._id, status: 'Open' }, (err, orders) => {
                        if (err) {
                            console.log('runOrder: Orders.find: ', err);
                            return;
                        }

                        if (orders && orders.length > 0) {
                            orders.forEach(order => {
                                if (order.timing && order.timing === 'day') {
                                    const current = Math.round((new Date()).getTime() / 1000);
                                    if (current - order.timestamp > 86400) {
                                        order.status = 'Cancelled';
                                        order.save(err => {
                                            if (err) {
                                                console.log('runOrder: order.save: ', err);
                                            }
                                        });

                                        return;
                                    }
                                }

                                Pending.findOne({ orderId: order._id }, (err, pending) => {
                                    if (err) {
                                        console.log('runOrder: Pending.findOne: ', err);
                                        return;
                                    }

                                    if (pending) {
                                        switch (pending.type) {
                                            case 'purchaseAsset':
                                                purchaseAsset(account, order, pending, co, wallet);
                                                break;
                                            case 'purchaseIndex':
                                                purchaseIndex(account, order, pending, co, wallet);
                                                break;
                                            case 'sellAsset':
                                                sellAsset(account, order, pending, co);
                                                break;
                                            case 'sellIndex':
                                                sellIndex(account, order, pending, co);
                                                break;
                                        }
                                    }
                                });
                            });
                        }
                    });
                });
            });
        });
    });
};

const purchaseAsset = (account, order, pending, co, wallet) => {
    Coins.findById(order.coinId).lean().exec((err, coin) => {
        if (err) {
            console.log('purchaseAsset: find: ', err);
            return;
        }

        if (!coin) return;

        const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === coin.symbol);
        if (cryptoId === -1) return;

        const amount = coin.price * order.quantity;
        const amountInWei = Web3Service.toWei((amount + 4.99) / co.price);

        if ((new BigNumber(amountInWei)).isGreaterThan(new BigNumber(wallet.quantity))) return;

        TruffleService.getNonce(account.beneficiary)
            .then(nonceBig => {
                const nonce = (new BigNumber(nonceBig)).toNumber();

                const approveAndCallSig = Web3Service.encodeFunctionSignature({
                    "inputs": [
                        {
                            "name": "_spender",
                            "type": "address"
                        },
                        {
                            "name": "_amount",
                            "type": "uint256"
                        },
                        {
                            "name": "_data",
                            "type": "bytes"
                        }
                    ],
                    "name": "approveAndCall",
                    "type": "function"
                });
                const extraData = Web3Service.encodeFunctionCall({
                    "inputs": [
                        {
                            "name": "_beneficiary",
                            "type": "address"
                        },
                        {
                            "name": "_cryptoIds",
                            "type": "uint256[]"
                        },
                        {
                            "name": "_amounts",
                            "type": "uint256[]"
                        }
                    ],
                    "name": "buy",
                    "type": "function"
                }, [account.beneficiary, [cryptoId], [order.quantity]]);

                TruffleService.getPreSignedHash(approveAndCallSig, amountInWei, extraData, 40000000000, nonce)
                    .then(txHash => {
                        const signed = Web3Service.sign(txHash, account.beneficiary, pending.input);
                        const tempSign = signed.signature.substr(0, signed.signature.length - 2) + (signed.v === '0x1b' ? '00' : '01');

                        TruffleService.approveAndCallPreSigned(tempSign, amountInWei, extraData, 40000000000, nonce)
                            .then(tx => {
                                const receipt = tx.receipt;

                                if (receipt && receipt.transactionHash) {
                                    order.status = 'Filled';
                                    order.amount = amount;
                                    order.txId = receipt.transactionHash;
                                    order.save(err => {
                                        if (err) {
                                            console.log('purchaseAsset: order.save: ', err);
                                        }
                                    });

                                    const asset = new Assets({
                                        accountId: account._id,
                                        coinId: order.coinId,
                                        quantity: order.quantity,
                                        amount: amount,
                                        orderType: order.type,
                                        txId: [receipt.transactionHash],
                                        timestamp: Math.round((new Date()).getTime() / 1000)
                                    });
                                    asset.save(err => {
                                        if (err) {
                                            console.log('purchaseAsset: asset.save: ', err);
                                        }
                                    });

                                    const transaction = new Transactions({
                                        orderId: order._id,
                                        blockHash: receipt.blockHash,
                                        blockNumber: receipt.blockNumber,
                                        contractAddress: receipt.contractAddress,
                                        cumulativeGasUsed: receipt.cumulativeGasUsed,
                                        gasUsed: receipt.gasUsed,
                                        from: receipt.from,
                                        to: receipt.to,
                                        status: receipt.status,
                                        transactionHash: receipt.transactionHash,
                                        transactionIndex: receipt.transactionIndex
                                    });
                                    transaction.save(err => {
                                        if (err) {
                                            console.log('purchaseAsset: transaction.save: ', err);
                                        }
                                    });

                                    removePending(pending._id);
                                }
                            })
                            .catch(err => {
                                throw(err);
                            });
                    })
                    .catch(err => {
                        throw(err);
                    });
            })
            .catch(err => {
                console.log('purchaseAsset: ', err);
            });
    });
};

const purchaseIndex = (account, order, pending, co, wallet) => {
    Indexes.findOne({ accountId: account._id, _id: order.indexId }, async (err, index) => {
        if (err) {
            console.log('purchaseIndex: findOne: ', err);
            return;
        }

        if (!index) return;

        let cryptoIds = [];
        let quantities = [];
        let quantitiesInWei = [];
        let coins = [];
        let amounts = [];
        let realAmount = 0;

        for (let i = 0; i < pending.assets.length; i++) {
            const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === pending.assets[i].symbol);
            if (cryptoId === -1) {
                return;
            }

            const coin = await Coins.findOne({ symbol: pending.assets[i].symbol }).lean().exec();
            if (coin) {
                coins.push(coin);

                cryptoIds.push(cryptoId + 1);

                const quantity = (co.price * parseFloat(pending.amount) * pending.assets[i].percent / 100 / coin.price).toFixed(2);
                quantities.push(quantity);
                quantitiesInWei.push((new BigNumber(quantity)).times(((new BigNumber(10)).exponentiatedBy(18))).toNumber());

                amounts.push(coin.price * quantity);
                realAmount += coin.price * quantity;
            }
        }

        const amountInWei = Web3Service.toWei((realAmount + 4.99) / co.price);
        if ((new BigNumber(amountInWei)).isGreaterThan(new BigNumber(wallet.quantity))) return;

        TruffleService.getNonce(account.beneficiary)
            .then(nonceBig => {
                const nonce = (new BigNumber(nonceBig)).toNumber();

                const approveAndCallSig = Web3Service.encodeFunctionSignature({
                    "inputs": [
                        {
                            "name": "_spender",
                            "type": "address"
                        },
                        {
                            "name": "_amount",
                            "type": "uint256"
                        },
                        {
                            "name": "_data",
                            "type": "bytes"
                        }
                    ],
                    "name": "approveAndCall",
                    "type": "function"
                });
                const extraData = Web3Service.encodeFunctionCall({
                    "inputs": [
                        {
                            "name": "_beneficiary",
                            "type": "address"
                        },
                        {
                            "name": "_cryptoIds",
                            "type": "uint256[]"
                        },
                        {
                            "name": "_amounts",
                            "type": "uint256[]"
                        }
                    ],
                    "name": "buy",
                    "type": "function"
                }, [account.beneficiary, cryptoIds, quantitiesInWei]);

                TruffleService.getPreSignedHash(approveAndCallSig, amountInWei, extraData, 40000000000, nonce)
                    .then(txHash => {
                        const signed = Web3Service.sign(txHash, account.beneficiary, pending.input);
                        const tempSign = signed.signature.substr(0, signed.signature.length - 2) + (signed.v === '0x1b' ? '00' : '01');

                        TruffleService.approveAndCallPreSigned(tempSign, amountInWei, extraData, 40000000000, nonce)
                            .then(tx => {
                                const receipt = tx.receipt;

                                if (receipt && receipt.transactionHash) {
                                    order.status = 'Filled';
                                    order.amount = realAmount;
                                    order.txId = receipt.transactionHash;
                                    order.save(err => {
                                        if (err) {
                                            console.log('purchaseIndex: order.save: ', err);
                                        }
                                    });

                                    index.txId = [receipt.transactionHash];
                                    index.amount = realAmount;
                                    index.confirmed = true;
                                    index.save(err => {
                                        if (err) {
                                            console.log('purchaseIndex: index.save: ', err);
                                            return;
                                        }

                                        pending.assets.forEach((asset, idx) => {
                                            const indexContains = new IndexContains({
                                                indexId: index._id,
                                                coinId: coins[idx]._id,
                                                percentage: asset.percent,
                                                quantity: quantities[idx],
                                                amount: amounts[idx]
                                            });
                                            indexContains.save(err => {
                                                if (err) {
                                                    console.log('purchaseIndex: indexContains.save: ', err);
                                                }
                                            });
                                        });
                                    });

                                    const transaction = new Transactions({
                                        orderId: order._id,
                                        blockHash: receipt.blockHash,
                                        blockNumber: receipt.blockNumber,
                                        contractAddress: receipt.contractAddress,
                                        cumulativeGasUsed: receipt.cumulativeGasUsed,
                                        gasUsed: receipt.gasUsed,
                                        from: receipt.from,
                                        to: receipt.to,
                                        status: receipt.status,
                                        transactionHash: receipt.transactionHash,
                                        transactionIndex: receipt.transactionIndex
                                    });
                                    transaction.save(err => {
                                        if (err) {
                                            console.log('purchaseIndex: transaction.save: ', err);
                                        }
                                    });

                                    removePending(pending._id);
                                }
                            })
                            .catch(err => {
                                throw(err);
                            });
                    })
                    .catch(err => {
                        throw(err);
                    });
            })
            .catch(err => {
                console.log('purchaseIndex: getNonce: ', err);
            });
    });
};

const sellAsset = (account, order, pending, co) => {
    Coins.findById(order.coinId).lean().exec((err, coin) => {
        if (err) {
            console.log('sellAsset: Coins.findById: ', err);
            return;
        }

        if (!coin) return;

        const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === coin.symbol);
        if (cryptoId === -1) {
            return;
        }

        Assets.findOne({ _id: pending.assetId, accountId: account._id }, (err, asset) => {
            if (err) {
                console.log('sellAsset: Assets.findOne: ', err);
                return;
            }

            if (!asset || asset.quantity < order.quantity) return;

            const amount = coin.price * order.quantity;
            const amountInWei = Web3Service.toWei((amount + 4.99) / co.price);
            const quantityInWei = (new BigNumber(order.quantity)).times(((new BigNumber(10)).exponentiatedBy(18))).toNumber();

            TruffleService.getNonce(account.beneficiary)
                .then(nonceBig => {
                    const nonce = (new BigNumber(nonceBig)).toNumber();

                    const approveAndCallSig = Web3Service.encodeFunctionSignature({
                        "inputs": [
                            {
                                "name": "_spender",
                                "type": "address"
                            },
                            {
                                "name": "_amount",
                                "type": "uint256"
                            },
                            {
                                "name": "_data",
                                "type": "bytes"
                            }
                        ],
                        "name": "approveAndCall",
                        "type": "function"
                    });
                    const extraData = Web3Service.encodeFunctionCall({
                        "inputs": [
                            {
                                "name": "_beneficiary",
                                "type": "address"
                            },
                            {
                                "name": "_cryptoIds",
                                "type": "uint256[]"
                            },
                            {
                                "name": "_amounts",
                                "type": "uint256[]"
                            }
                        ],
                        "name": "sell",
                        "type": "function"
                    }, [account.beneficiary, [cryptoId], [quantityInWei]]);

                    TruffleService.getPreSignedHash(approveAndCallSig, amountInWei, extraData, 40000000000, nonce)
                        .then(txHash => {
                            const signed = Web3Service.sign(txHash, account.beneficiary, pending.input);
                            const tempSign = signed.signature.substr(0, signed.signature.length - 2) + (signed.v === '0x1b' ? '00' : '01');

                            TruffleService.approveAndCallPreSigned(tempSign, amountInWei, extraData, 40000000000, nonce)
                                .then(tx => {
                                    const receipt = tx.receipt;

                                    if (receipt && receipt.transactionHash) {
                                        order.status = 'Filled';
                                        order.amount = amount;
                                        order.txId = receipt.transactionHash;
                                        order.save(err => {
                                            if (err) {
                                                console.log('sellAsset: order.save: ', err);
                                            }
                                        });

                                        if (asset.quantity === order.quantity) {
                                            Assets.deleteOne({ _id: asset._id }).exec();
                                        } else {
                                            asset.quantity -= order.quantity;
                                            asset.amount -= amount;
                                            asset.txId.push(receipt.transactionHash);
                                            asset.orderType = order.type;
                                            asset.save(err => {
                                                if (err) {
                                                    console.log('sellAsset: save: ', err);
                                                }
                                            });
                                        }

                                        const transaction = new Transactions({
                                            orderId: order._id,
                                            blockHash: receipt.blockHash,
                                            blockNumber: receipt.blockNumber,
                                            contractAddress: receipt.contractAddress,
                                            cumulativeGasUsed: receipt.cumulativeGasUsed,
                                            gasUsed: receipt.gasUsed,
                                            from: receipt.from,
                                            to: receipt.to,
                                            status: receipt.status,
                                            transactionHash: receipt.transactionHash,
                                            transactionIndex: receipt.transactionIndex
                                        });
                                        transaction.save(err => {
                                            if (err) {
                                                console.log('sellAsset: transaction.save: ', err);
                                            }
                                        });

                                        removePending(pending._id);
                                    }
                                })
                                .catch(err => {
                                    throw(err);
                                });
                        })
                        .catch(err => {
                            throw(err);
                        });
                })
                .catch(err => {
                    console.log('sellAsset: getNonce: ', err);
                });
        });
    });
};

const sellIndex = (account, order, pending, co) => {
    Indexes.findOne({ accountId: account._id, _id: order.indexId }, (err, index) => {
        if (err) {
            console.log('sellIndex: findOne: ', err);
            return;
        }

        if (!index) return;

        TruffleService.getNonce(account.beneficiary)
            .then(async nonceBig => {
                const nonce = (new BigNumber(nonceBig)).toNumber();

                let cryptoIds = [];
                let quantities = [];
                let quantitiesInWei = [];
                let amount = 0;
                try {
                    const indexContains = await IndexContains.find({ indexId: index._id }).lean().exec();
                    for (let i = 0; i < indexContains.length; i++) {
                        const coin = await Coins.findById(indexContains[i].coinId).lean().exec();
                        if (coin) {
                            const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === coin.symbol);
                            if (cryptoId === -1) {
                                return;
                            }

                            cryptoIds.push(cryptoId + 1);
                            quantities.push(indexContains[i].quantity);
                            quantitiesInWei.push((new BigNumber(indexContains[i].quantity)).times(((new BigNumber(10)).exponentiatedBy(18))).toNumber());
                            amount += coin.price * indexContains[i].quantity;
                        }
                    }
                } catch (err) {
                    console.log('sellIndex: IndexContains: ', err);
                    return;
                }

                const amountInWei = Web3Service.toWei((amount + 4.99) / co.price);
                const approveAndCallSig = Web3Service.encodeFunctionSignature({
                    "inputs": [
                        {
                            "name": "_spender",
                            "type": "address"
                        },
                        {
                            "name": "_amount",
                            "type": "uint256"
                        },
                        {
                            "name": "_data",
                            "type": "bytes"
                        }
                    ],
                    "name": "approveAndCall",
                    "type": "function"
                });
                const extraData = Web3Service.encodeFunctionCall({
                    "inputs": [
                        {
                            "name": "_beneficiary",
                            "type": "address"
                        },
                        {
                            "name": "_cryptoIds",
                            "type": "uint256[]"
                        },
                        {
                            "name": "_amounts",
                            "type": "uint256[]"
                        }
                    ],
                    "name": "sell",
                    "type": "function"
                }, [account.beneficiary, cryptoIds, quantitiesInWei]);

                TruffleService.getPreSignedHash(approveAndCallSig, amountInWei, extraData, 40000000000, nonce)
                    .then(txHash => {
                        const signed = Web3Service.sign(txHash, account.beneficiary, pending.input);
                        const tempSign = signed.signature.substr(0, signed.signature.length - 2) + (signed.v === '0x1b' ? '00' : '01');

                        TruffleService.approveAndCallPreSigned(tempSign, amountInWei, extraData, 40000000000, nonce)
                            .then(tx => {
                                const receipt = tx.receipt;

                                if (receipt && receipt.transactionHash) {
                                    order.status = 'Filled';
                                    order.amount = amount;
                                    order.txId = receipt.transactionHash;
                                    order.save(err => {
                                        if (err) {
                                            console.log('sellIndex: order.save: ', err);
                                        }
                                    });

                                    index.txId.push(receipt.transactionHash);
                                    index.amount = amount;
                                    index.confirmed = false;
                                    index.save(err => {
                                        if (err) {
                                            console.log('sellIndex: index.save: ', err);
                                        }
                                    });

                                    const transaction = new Transactions({
                                        orderId: order._id,
                                        blockHash: receipt.blockHash,
                                        blockNumber: receipt.blockNumber,
                                        contractAddress: receipt.contractAddress,
                                        cumulativeGasUsed: receipt.cumulativeGasUsed,
                                        gasUsed: receipt.gasUsed,
                                        from: receipt.from,
                                        to: receipt.to,
                                        status: receipt.status,
                                        transactionHash: receipt.transactionHash,
                                        transactionIndex: receipt.transactionIndex
                                    });
                                    transaction.save(err => {
                                        if (err) {
                                            console.log('sellIndex: transaction.save: ', err);
                                        }
                                    });

                                    removePending(pending._id);
                                }
                            })
                            .catch(err => {
                                throw(err);
                            });
                    })
                    .catch(err => {
                        throw(err);
                    });
            })
            .catch(err => {
                console.log('sellIndex: getNonce: ', err);
            });
    });
};

const removePending = (pendingId) => {
    Pending.deleteOne({ id: pendingId }, err => {
        if (err) {
            console.log('removePending: ', err);
        }
    });
};