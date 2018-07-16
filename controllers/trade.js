const schedule = require('node-schedule');
const BigNumber = require('bignumber.js');

const Accounts = require('../models/Accounts');
const Assets = require('../models/Assets');
const Coins = require('../models/Coins');
const Orders = require('../models/Orders');
const Transactions = require('../models/Transactions');
const Pending = require('../models/Pending');
const Indexes = require('../models/Indexes');
const IndexContains = require('../models/IndexContains');

const { cryptoIdToSymbol } = require('../services/Config');
const Web3Service = require('../services/Web3Service');
const TruffleService = require('../services/TruffleService');

let updateOrder;

exports.tradeSchedule = () => {
    updateOrder = schedule.scheduleJob('*/1 * * * *', runOrder);
};

exports.cancelTradeSchedule = () => {
    if (updateOrder) {
        updateOrder.cancel();
    }
};

const runOrder = () => {
    Accounts.find((err, accounts) => {
        if (err) {
            console.log('runOrder: Accounts.find: ', err);
            return;
        }

        accounts.forEach(account => {
            Orders.find({ accountId: account._id, status: 'Open' }, (err, orders) => {
                if (err) {
                    console.log('runOrder: Orders.find: ', err);
                    return;
                }

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
                                    purchaseAsset(account, order, pending);
                                    break;
                                case 'purchaseIndex':
                                    purchaseIndex(account, order, pending);
                                    break;
                                case 'sellAsset':
                                    sellAsset(account, order, pending);
                                    break;
                                case 'sellIndex':
                                    sellIndex(account, order, pending);
                                    break;
                            }
                        }
                    });
                });
            });
        });
    });
};

const purchaseAsset = (account, order, pending) => {
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
            }, [account.beneficiary, pending.cryptoIds, pending.quantitiesInWei]);

            TruffleService.getPreSignedHash(approveAndCallSig, pending.amountInWei, extraData, 40000000000, nonce)
                .then(txHash => {
                    const signed = Web3Service.sign(txHash, account.beneficiary, pending.input);
                    const tempSign = signed.signature.substr(0, signed.signature.length - 2) + (signed.v === '0x1b' ? '00' : '01');

                    TruffleService.approveAndCallPreSigned(tempSign, pending.amountInWei, extraData, 40000000000, nonce)
                        .then(tx => {
                            const receipt = tx.receipt;

                            if (receipt && receipt.transactionHash) {
                                order.status = 'Filled';
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
                                    amount: order.amount,
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
};

const purchaseIndex = (account, order, pending) => {
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
            }, [account.beneficiary, pending.cryptoIds, pending.quantitiesInWei]);

            TruffleService.getPreSignedHash(approveAndCallSig, pending.amountInWei, extraData, 40000000000, nonce)
                .then(txHash => {
                    const signed = Web3Service.sign(txHash, account.beneficiary, pending.input);
                    const tempSign = signed.signature.substr(0, signed.signature.length - 2) + (signed.v === '0x1b' ? '00' : '01');

                    TruffleService.approveAndCallPreSigned(tempSign, pending.amountInWei, extraData, 40000000000, nonce)
                        .then(tx => {
                            const receipt = tx.receipt;

                            if (receipt && receipt.transactionHash) {
                                order.status = 'Filled';
                                order.txId = receipt.transactionHash;
                                order.save(err => {
                                    if (err) {
                                        console.log('purchaseIndex: order.save: ', err);
                                    }
                                });

                                index.txId = [receipt.transactionHash];
                                index.confirmed = true;
                                index.save(err => {
                                    if (err) {
                                        console.log('purchaseIndex: index.save: ', err);
                                        return;
                                    }

                                    pending.assets.forEach((asset, idx) => {
                                        const indexContains = new IndexContains({
                                            indexId: index._id,
                                            coinId: pending.coins[idx].id,
                                            percentage: asset.percentage,
                                            quantity: asset.quantity,
                                            amount: asset.quantity * pending.coins[idx].price
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
};

const sellAsset = (account, order, pending) => {
    Assets.findOne({ _id: pending.assetId, accountId: account._id }, (err, asset) => {
        if (err) {
            console.log('sellAsset: Assets.findOne: ', err);
            return;
        }

        if (asset) {
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
                    }, [account.beneficiary, pending.cryptoIds, pending.quantitiesInWei]);

                    TruffleService.getPreSignedHash(approveAndCallSig, pending.amountInWei, extraData, 40000000000, nonce)
                        .then(txHash => {
                            const signed = Web3Service.sign(txHash, account.beneficiary, pending.input);
                            const tempSign = signed.signature.substr(0, signed.signature.length - 2) + (signed.v === '0x1b' ? '00' : '01');

                            TruffleService.approveAndCallPreSigned(tempSign, pending.amountInWei, extraData, 40000000000, nonce)
                                .then(tx => {
                                    const receipt = tx.receipt;

                                    if (receipt && receipt.transactionHash) {
                                        order.status = 'Filled';
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
                                            asset.amount -= order.amount;
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
        }
    });
};

const sellIndex = (account, order, pending) => {
    Indexes.findOne({ accountId: account._id, _id: pending.indexId }, (err, index) => {
        if (err) {
            console.log('sellIndex: findOne: ', err);
            return;
        }

        if (index) {
            TruffleService.getNonce(account.beneficiary)
                .then(async nonceBig => {
                    const nonce = (new BigNumber(nonceBig)).toNumber();

                    let cryptoIds = [];
                    let quantities = [];
                    let quantitiesInWei = [];
                    let amount = 0;
                    let indexContains;
                    try {
                        indexContains = await IndexContains.find({ indexId: index._id }).exec();
                        for (let i = 0; i < indexContains.length; i++) {
                            const indexContain = indexContains[i];
                            const coin = await Coins.findById(indexContain.coinId).exec();
                            if (coin) {
                                const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === coin.symbol);
                                if (cryptoId === -1) {
                                    return;
                                }

                                cryptoIds.push(cryptoId + 1);
                                quantities.push(indexContain.quantity);
                                quantitiesInWei.push((new BigNumber(indexContain.quantity)).times(((new BigNumber(10)).exponentiatedBy(18))).toNumber());
                                amount += coin.price * indexContain.quantity;
                            }
                        }
                    } catch (err) {
                        console.log('sellIndex: IndexContains: ', err);
                        return;
                    }

                    const amountInWei = (new BigNumber(amount)).times(((new BigNumber(10)).exponentiatedBy(18))).toString();
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
                                        order.txId = receipt.transactionHash;
                                        order.save(err => {
                                            if (err) {
                                                console.log('sellIndex: order.save: ', err);
                                            }
                                        });

                                        index.txId.push(receipt.transactionHash);
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
        }
    });
};

const removePending = (pendingId) => {
    Pending.deleteOne({ id: pendingId }, err => {
        if (err) {
            console.log('removePending: ', err);
        }
    });
};