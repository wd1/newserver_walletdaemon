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
const { hexToDec } = require('../services/hex2dec');
const Web3Service = require('../services/Web3Service');
const TruffleService = require('../services/TruffleService');

let updateOrder, eventsMg;

exports.tradeSchedule = () => {
    updateOrder = schedule.scheduleJob('*/2 * * * *', runOrder);
    eventsMg = schedule.scheduleJob('*/30 * * * * *', eventsManager);
};

exports.cancelTradeSchedule = () => {
    if (updateOrder) {
        updateOrder.cancel();
    }
};

exports.cancelEventsSchedule = () => {
    if (eventsMg) {
        eventsMg.cancel();
    }
};

const runOrder = () => {
    Coins.find({}, 'symbol price', { lean: true }, (err, coins) => {
        if (err) {
            console.log('runOrder: Coins.findOne: ', err);
            return;
        }

        if (!coins || coins.length === 0) {
            console.log('runOrder: Coins.findOne: no coins');
            return;
        }

        const coIndex = coins.findIndex(coin => coin.symbol === 'COIN');
        if (coIndex === -1) {
            console.log('*** COIN does not exist in database. ***');
            return;
        }

        Accounts.find({}, 'beneficiary', { lean: true }, (err, accounts) => {
            if (err) {
                console.log('runOrder: Accounts.find: ', err);
                return;
            }

            accounts.forEach(account => {
                Wallets.findOne({ accountId: account._id, coinId: coins[coIndex]._id }, 'quantity', { lean: true }, (err, wallet) => {
                    if (err) {
                        console.log('runOrder: Wallets.findOne: ', err);
                        return;
                    }

                    if (!wallet || wallet.quantity * coins[coIndex].price < 5) return;

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
                                                purchaseAsset(account, order, pending, coins, coIndex, wallet);
                                                break;
                                            case 'purchaseIndex':
                                                purchaseIndex(account, order, pending, coins, coIndex, wallet);
                                                break;
                                            case 'sellAsset':
                                                sellAsset(account, order, pending, coins, coIndex);
                                                break;
                                            case 'sellIndex':
                                                sellIndex(account, order, pending, coins, coIndex);
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

const purchaseAsset = (account, order, pending, coins, coIndex, wallet) => {
    const coinIndex = coins.findIndex(coin => coin._id == order.coinId);
    if (coinIndex === -1) {
        console.log('purchaseAsset: no coin found');
        return;
    }

    const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === coins[coinIndex].symbol);
    if (cryptoId === -1) return;

    if (order.type === 'limit' && order.price < coins[coinIndex].price) return;

    const amount = coins[coinIndex].price * order.quantity;
    const amountInWei = Web3Service.toWei((amount + 4.99) / coins[coIndex].price);

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
                            if (tx.receipt && tx.receipt.transactionHash) {
                                // Update order
                                order.receipt = tx.receipt;
                                order.save(err => {
                                    if (err) {
                                        console.log('purchaseAsset: order.save: ', err);
                                    }
                                });
                            } else {
                                console.log('Error receipt: ', tx.receipt);
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

const purchaseIndex = (account, order, pending, coins, coIndex, wallet) => {
    Indexes.findOne({ accountId: account._id, _id: order.indexId }, async (err, index) => {
        if (err) {
            console.log('purchaseIndex: findOne: ', err);
            return;
        }

        if (!index) return;

        let cryptoIds = [];
        let quantities = [];
        let quantitiesInWei = [];
        let coinList = [];
        let amounts = [];
        let realAmount = 0;

        for (let i = 0; i < pending.assets.length; i++) {
            const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === pending.assets[i].symbol);
            if (cryptoId === -1) return;

            const coinIndex = coins.findIndex(coin => coin.symbol === pending.assets[i].symbol);
            if (coinIndex > -1) {
                coinList.push(coins[coinIndex]);

                cryptoIds.push(cryptoId);

                const quantity = (coins[coIndex].price * parseFloat(pending.amount) * pending.assets[i].percent / 100 / coins[coinIndex].price);
                quantities.push(quantity);
                quantitiesInWei.push((new BigNumber(quantity)).times(((new BigNumber(10)).exponentiatedBy(18))).toNumber());

                amounts.push(coins[coinIndex].price * quantity);
                realAmount += coins[coinIndex].price * quantity;
            }
        }

        const amountInWei = Web3Service.toWei((realAmount + 4.99) / coins[coIndex].price);
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
                                if (tx.receipt && tx.receipt.transactionHash) {
                                    // Update order
                                    order.receipt = tx.receipt;
                                    order.amount = realAmount;
                                    order.save(err => {
                                        if (err) {
                                            console.log('purchaseIndex: order.save: ', err);
                                        }
                                    });

                                    index.amount = realAmount;
                                    index.save(err => {
                                        if (err) {
                                            console.log('purchaseIndex: index.save: ', err);
                                            return;
                                        }

                                        pending.assets.forEach((asset, idx) => {
                                            const indexContains = new IndexContains({
                                                indexId: index._id,
                                                coinId: coinList[idx]._id,
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
                                } else {
                                    console.log('Error receipt: ', tx.receipt);
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

const sellAsset = (account, order, pending, coins, coIndex) => {
    const coinIndex = coins.findIndex(coin => coin._id == order.coinId);
    if (coinIndex === -1) {
        console.log('sellAsset: no coin found');
        return;
    }

    const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === coins[coinIndex].symbol);
    if (cryptoId === -1) return;

    if (order.type === 'limit' && order.price < coins[coinIndex].price) return;

    Assets.findOne({ _id: pending.assetId, accountId: account._id }, (err, asset) => {
        if (err) {
            console.log('sellAsset: Assets.findOne: ', err);
            return;
        }

        if (!asset || asset.quantity < order.quantity) return;

        const amount = coins[coinIndex].price * order.quantity;
        const amountInWei = Web3Service.toWei((amount + 4.99) / coins[coIndex].price);
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
                                if (tx.receipt && tx.receipt.transactionHash) {
                                    // Update order
                                    order.receipt = tx.receipt;
                                    order.save(err => {
                                        if (err) {
                                            console.log('sellAsset: order.save: ', err);
                                        }
                                    });
                                } else {
                                    console.log('Error receipt: ', tx.receipt);
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
};

const sellIndex = (account, order, pending, coins, coIndex) => {
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
                    const indexContains = await IndexContains.find({ indexId: index._id }, null, { lean: true }).exec();
                    for (let i = 0; i < indexContains.length; i++) {
                        const coinIndex = coins.findIndex(coin => coin._id === indexContains[i].coinId);
                        if (coinIndex > -1) {
                            const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === coins[coinIndex].symbol);
                            if (cryptoId === -1) return;

                            cryptoIds.push(cryptoId);
                            quantities.push(indexContains[i].quantity);
                            quantitiesInWei.push((new BigNumber(indexContains[i].quantity)).times(((new BigNumber(10)).exponentiatedBy(18))).toNumber());
                            amount += coins[coinIndex].price * indexContains[i].quantity;
                        }
                    }
                } catch (err) {
                    console.log('sellIndex: IndexContains: ', err);
                    return;
                }

                const amountInWei = Web3Service.toWei((amount + 4.99) / coins[coIndex].price);
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
                                if (tx.receipt && tx.receipt.transactionHash) {
                                    // Update order
                                    order.receipt = tx.receipt;
                                    order.save(err => {
                                        if (err) {
                                            console.log('sellIndex: order.save: ', err);
                                        }
                                    });
                                } else {
                                    console.log('Error receipt: ', tx.receipt);
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

const removePending = (orderId) => {
    Pending.deleteOne({ orderId: orderId }, err => {
        if (err) {
            console.log('removePending: ', err);
        }
    });
};

let fromBlock = 0;
let totalEvents = [];
const eventsManager = () => {
    Coins.find({}, null, { lean: true }, (err, coins) => {
        if (err) {
            console.log('eventsManager Coins.find: ', err);
            return;
        }

        if (coins && coins.length > 0) {
            TruffleService.eventsWatch(fromBlock)
                .then(events => {
                    let prevLength = totalEvents.length;
                    totalEvents = totalEvents.concat(events);

                    events.forEach((e, idx) => {
                        if (e.event && e.event === 'newOraclizeQuery') return;

                        if (e.data && e.transactionHash) {
                            Orders.findOne({ txId: e.transactionHash}, { lean: true }, (err, o) => {
                                if (err) {
                                    console.log('eventsManager Orders.findOne: ', err);
                                    return;
                                }

                                if (!o) {
                                    const address = '0x' + e.topics[1].substring(26);
                                    Accounts.findOne({ beneficiary: address }, 'beneficiary', { lean: true }, async (err, account) => {
                                        if (err) {
                                            console.log('eventsManager Accounts.findOne: ', err);
                                            return;
                                        }

                                        if (account) {
                                            let type = 'asset';
                                            let cryptoIds = [];
                                            let quantities = [];
                                            let prices = [];

                                            const params = e.data.substring(2).match(/.{1,64}/g);
                                            if (params.length > 3) {
                                                const cryptoCount = parseInt(hexToDec(params[3]));
                                                if (cryptoCount > 1) {
                                                    type = 'index';
                                                }
                                                for (let i = 4; i < 4 + cryptoCount; i++) {
                                                    cryptoIds.push(parseInt(hexToDec(params[i])));
                                                }

                                                const quantityCount = parseInt(hexToDec(params[4 + cryptoCount]));
                                                for (let i = 5 + cryptoCount; i < 5 + cryptoCount + quantityCount; i++) {
                                                    quantities.push(Web3Service.fromWei(hexToDec(params[i])));
                                                }

                                                const priceCount = parseInt(hexToDec(params[5 + cryptoCount + quantityCount]));
                                                for (let i = 6 + cryptoCount + quantityCount; i < 6 + cryptoCount + quantityCount + priceCount; i++) {
                                                    prices.push(Web3Service.fromWei(hexToDec(params[i])));
                                                }

                                                let i = prevLength + idx;
                                                while (i > 0) {
                                                    if (totalEvents[i].event && totalEvents[i].event === 'newOraclizeQuery') {
                                                        const order = await Orders.findOne({
                                                            accountId: account._id,
                                                            'receipt.transactionHash': totalEvents[i].transactionHash,
                                                            status: 'Open'
                                                        }).exec();

                                                        if (order) {
                                                            if ((type === 'asset' && order.coinId) || (type === 'index' && order.indexId)) {
                                                                if (order.coinId) {
                                                                    const coinIdx = coins.findIndex(coin => coin.symbol === cryptoIdToSymbol[cryptoIds[0]].symbol);
                                                                    if (coinIdx > -1) {
                                                                        if (coins[coinIdx]._id == order.coinId && parseFloat(order.quantity).toFixed(8) === parseFloat(quantities[0]).toFixed(8)) {
                                                                            order.txId = e.transactionHash;
                                                                            order.status = 'Filled';
                                                                            order.save(err => {
                                                                                if (err) {
                                                                                    console.log('eventsManager: order.save: ', err);
                                                                                }
                                                                            });

                                                                            if (order.action === 'Buy') {
                                                                                // Create asset
                                                                                const asset = new Assets({
                                                                                    accountId: account._id,
                                                                                    coinId: order.coinId,
                                                                                    quantity: order.quantity,
                                                                                    amount: order.amount,
                                                                                    orderType: order.type,
                                                                                    txId: [e.transactionHash],
                                                                                    timestamp: Math.round((new Date()).getTime() / 1000)
                                                                                });
                                                                                asset.save(err => {
                                                                                    if (err) {
                                                                                        console.log('eventsManager: asset.save: ', err);
                                                                                    }
                                                                                });
                                                                            } else {
                                                                                Assets.findOne({ _id: order.assetId, accountId: order.accountId }, (err, asset) => {
                                                                                    if (asset.quantity === quantity) {
                                                                                        // Delete asset in case of selling whole amount of asset
                                                                                        Assets.deleteOne({ _id: asset._id }, err => {
                                                                                            if (err) {
                                                                                                console.log('eventsManager: Assets.deleteOne: ', err);
                                                                                            }
                                                                                        });
                                                                                    } else {
                                                                                        // Update asset amount and quantity
                                                                                        asset.quantity -= order.quantity;
                                                                                        asset.amount -= order.amount;
                                                                                        asset.txId.push(e.transactionHash);
                                                                                        asset.orderType = order.type;
                                                                                        asset.save(err => {
                                                                                            if (err) {
                                                                                                console.log('eventsManager: asset.save: ', err);
                                                                                            }
                                                                                        });
                                                                                    }
                                                                                });
                                                                            }

                                                                            // Create transaction
                                                                            const transaction = new Transactions({
                                                                                orderId: order._id,
                                                                                blockHash: e.blockHash,
                                                                                blockNumber: e.blockNumber,
                                                                                contractAddress: order.receipt.contractAddress,
                                                                                cumulativeGasUsed: order.receipt.cumulativeGasUsed,
                                                                                gasUsed: order.receipt.gasUsed,
                                                                                from: order.receipt.from,
                                                                                to: order.receipt.to,
                                                                                status: order.receipt.status,
                                                                                transactionHash: e.transactionHash,
                                                                                transactionIndex: e.transactionIndex
                                                                            });
                                                                            transaction.save(err => {
                                                                                if (err) {
                                                                                    console.log('eventsManager: transaction.save: ', err);
                                                                                }
                                                                            });

                                                                            removePending(order._id);

                                                                            // console.log('Type: ', type);
                                                                            // console.log('Action: ', order.action);
                                                                            // console.log('Count: ', cryptoCount);
                                                                            // console.log('Ids: ', cryptoIds.join(','));
                                                                            // console.log('Quantities: ', quantities.join(','));
                                                                            // console.log('Prices: ', prices.join(','));
                                                                            // console.log('\n');

                                                                            // fromBlock = e.blockNumber;

                                                                            break;
                                                                        }
                                                                    }
                                                                } else {
                                                                    const index = await Indexes.findOne({ _id: order.indexId, accountId: account._id, confirmed: false }).exec();
                                                                    if (index) {
                                                                        const indexContains = await IndexContains.find({ indexId: index._id }, null, { lean: true }).exec();
                                                                        if (indexContains && indexContains.length === cryptoCount) {
                                                                            let match = true;
                                                                            for (let j = 0; j < cryptoIds.length; j++) {
                                                                                const coinIdx = coins.findIndex(coin => coin.symbol === cryptoIdToSymbol[cryptoIds[j]].symbol);
                                                                                if (coinIdx > -1) {
                                                                                    const indexContainIdx = indexContains.findIndex(ic => ic.coinId == coins[coinIdx]._id && parseFloat(ic.quantity).toFixed(8) === parseFloat(quantities[j]).toFixed(8));
                                                                                    if (indexContainIdx === -1) {
                                                                                        match = false;
                                                                                        break;
                                                                                    }
                                                                                }
                                                                            }

                                                                            if (match) {
                                                                                // Update order
                                                                                order.txId = e.transactionHash;
                                                                                order.status = 'Filled';
                                                                                order.save(err => {
                                                                                    if (err) {
                                                                                        console.log('eventsManager: order.save: ', err);
                                                                                    }
                                                                                });

                                                                                // Update index
                                                                                if (order.action === 'Buy') {
                                                                                    index.txId = [e.transactionHash];
                                                                                    index.confirmed = true;
                                                                                    index.save(err => {
                                                                                        if (err) {
                                                                                            console.log('eventsManager: index.save: ', err);
                                                                                        }
                                                                                    });
                                                                                } else {
                                                                                    index.txId.push(e.transactionHash);
                                                                                    index.confirmed = false;
                                                                                    index.save(err => {
                                                                                        if (err) {
                                                                                            console.log('eventsManager: index.save: ', err);
                                                                                        }
                                                                                    });
                                                                                }

                                                                                // Create transaction
                                                                                const transaction = new Transactions({
                                                                                    orderId: order._id,
                                                                                    blockHash: e.blockHash,
                                                                                    blockNumber: e.blockNumber,
                                                                                    contractAddress: order.receipt.contractAddress,
                                                                                    cumulativeGasUsed: order.receipt.cumulativeGasUsed,
                                                                                    gasUsed: order.receipt.gasUsed,
                                                                                    from: order.receipt.from,
                                                                                    to: order.receipt.to,
                                                                                    status: order.receipt.status,
                                                                                    transactionHash: e.transactionHash,
                                                                                    transactionIndex: e.transactionIndex
                                                                                });
                                                                                transaction.save(err => {
                                                                                    if (err) {
                                                                                        console.log('eventsManager: transaction.save: ', err);
                                                                                    }
                                                                                });

                                                                                removePending(order._id);

                                                                                // console.log('Type: ', type);
                                                                                // console.log('Action: ', order.action);
                                                                                // console.log('Count: ', cryptoCount);
                                                                                // console.log('Ids: ', cryptoIds.join(','));
                                                                                // console.log('Quantities: ', quantities.join(','));
                                                                                // console.log('Prices: ', prices.join(','));
                                                                                // console.log('\n');

                                                                                // fromBlock = e.blockNumber;

                                                                                break;
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }

                                                    i--;
                                                }
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    });
                })
                .catch(err => {
                    console.log('eventsManager: ', err);
                });
        }
    });
};