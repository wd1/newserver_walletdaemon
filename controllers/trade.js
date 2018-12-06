const schedule = require('node-schedule');
const fetch = require('node-fetch');
const BigNumber = require('bignumber.js');

const Accounts = require('../models/Accounts');
const Assets = require('../models/Assets');
const Indexes = require('../models/Indexes');
const Wallets = require('../models/Wallets');
const Coins = require('../models/Coins');
const Orders = require('../models/Orders');
const Transactions = require('../models/Transactions');
const Pending = require('../models/Pending');
const Blocks = require('../models/Blocks');

const { cryptoIdToSymbol, VERIFY_URI } = require('../services/Config');
const { hexToDec } = require('../services/hex2dec');
const Web3Service = require('../services/Web3Service');
const TruffleService = require('../services/TruffleService');

let eventsMg;
let processing = false;

const runOrder = async () => {
    try {
        const coins = await Coins.find({}, 'symbol price', { lean: true }).exec();
        if (coins && coins.length > 0) {
            const coIndex = coins.findIndex(coin => coin.symbol === 'COIN');
            if (coIndex > -1) {
                const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
                const wallets = await Wallets.find({ coinId: coins[coIndex]._id, version: 'v3' }, 'accountId quantity', { lean: true }).exec();
                const openOrders = await Orders.find({ status: 'Open', 'receipt.transactionHash': null }).exec();
                const pendings = await Pending.find({}).exec();

                if (
                    accounts && accounts.length > 0 &&
                    wallets && wallets.length > 0 &&
                    openOrders && openOrders.length > 0
                ) {
                    accounts.forEach(account => {
                        const walletIdx = wallets.findIndex(w => w.accountId == account._id);
                        if (walletIdx === -1) return;

                        if (!wallets[walletIdx] || wallets[walletIdx].quantity * coins[coIndex].price < 5) return;

                        const orders = openOrders.filter(o => o.accountId == account._id);
                        orders.forEach(order => {
                            if (order.type === 'limit' && order.timing === 'day') {
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

                            const pendingIdx = pendings.findIndex(p => p.orderId == order._id);
                            if (pendingIdx > -1) {
                                switch (pendings[pendingIdx].type) {
                                case 'purchaseAsset':
                                    purchaseAsset(account, order, pendings[pendingIdx], coins, coIndex, wallets[walletIdx]);
                                    break;
                                case 'purchaseIndex':
                                    purchaseIndex(account, order, pendings[pendingIdx], coins, coIndex, wallets[walletIdx]);
                                    break;
                                case 'sellAsset':
                                    sellAsset(account, order, pendings[pendingIdx], coins, coIndex);
                                    break;
                                case 'sellIndex':
                                    sellIndex(account, order, pendings[pendingIdx], coins, coIndex);
                                    break;
                                default:
                                    break;
                                }
                            }
                        });
                    });
                }
            }
        }
    } catch (e) {
        console.log('runOrder: ', e);
    }

    setTimeout(runOrder, 120000);
};

const purchaseAsset = async (account, order, pending, coins, coIndex, wallet) => {
    try {
        const coinIndex = coins.findIndex(coin => coin._id == order.coinId);
        if (coinIndex === -1) {
            console.log('purchaseAsset: no coin found');
            return;
        }

        const response = await fetch(`${VERIFY_URI}?cryptos=${coins[coinIndex].symbol}&amounts=${order.quantity}`);
        const json = await response.json();
        if (parseFloat(json[coins[coinIndex].symbol].amount) < order.quantity) {
            console.log('purchaseAsset - verify: Amount verify failed.');
            return;
        }

        const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === coins[coinIndex].symbol);
        if (cryptoId === -1) return;

        if (order.type === 'limit' && order.price < coins[coinIndex].price) return;

        const amount = coins[coinIndex].price * order.quantity;
        const amountInWei = Web3Service.toWei((amount + 4.99) / coins[coIndex].price);

        // Get quantity in Wei
        const quantityInWei = Web3Service.toWei(order.quantity);

        if ((new BigNumber(amountInWei)).isGreaterThan(new BigNumber(wallet.quantity))) return;

        // Get nonce
        const nonce = new Date().getTime();

        const orders = await Orders.find({
            accountId: account._id,
            action: 'Buy',
            status: 'Open',
            txId: null
        }, 'amount', { lean: true }).exec();

        let sendAmount = amount + 4.99;
        if (orders && orders.length > 0) {
            orders.forEach(o => {
                sendAmount += o.amount + 4.99;
            });
        }

        const sendAmountInWei = Web3Service.toWei(sendAmount * 1.01 / coins[coIndex].price);

        const approveAndCallSig = Web3Service.encodeFunctionSignature({
            inputs: [
                {
                    name: '_spender',
                    type: 'address'
                },
                {
                    name: '_amount',
                    type: 'uint256'
                },
                {
                    name: '_data',
                    type: 'bytes'
                }
            ],
            name: 'approveAndCall',
            type: 'function'
        });
        const extraData = Web3Service.encodeFunctionCall({
            inputs: [
                {
                    name: '_beneficiary',
                    type: 'address'
                },
                {
                    name: '_cryptoIds',
                    type: 'uint256[]'
                },
                {
                    name: '_amounts',
                    type: 'uint256[]'
                }
            ],
            name: 'buy',
            type: 'function'
        }, [account.beneficiary, [cryptoId], [quantityInWei]]);

        TruffleService.getPreSignedHash(approveAndCallSig, sendAmountInWei, extraData, 40000000000, nonce)
            .then(txHash => {
                const signed = Web3Service.sign(txHash, account.beneficiary, pending.input);
                const tempSign = signed.signature.substr(0, signed.signature.length - 2) + (signed.v === '0x1b' ? '00' : '01');

                TruffleService.approveAndCallPreSigned(tempSign, sendAmountInWei, extraData, 40000000000, nonce)
                    .then(tx => {
                        if (tx.receipt && tx.receipt.transactionHash) {
                            // Update order
                            order.amount = amount;
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
                        throw (err);
                    });
            })
            .catch(err => {
                console.log('purchaseAsset: ', err);
            });
    } catch (e) {
        console.log('purchaseAsset: ', e);
    }
};

const purchaseIndex = async (account, order, pending, coins, coIndex, wallet) => {
    try {
        const index = await Indexes.findOne({ accountId: account._id, _id: order.indexId }).exec();
        if (!index) return;

        const cryptoIds = [];
        const prices = [];
        const quantities = [];
        const quantitiesInWei = [];
        const coinList = [];
        const amounts = [];
        let realAmount = 0;

        for (let i = 0; i < pending.assets.length; i++) {
            const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === pending.assets[i].symbol);
            if (cryptoId === -1) return;

            const coinIndex = coins.findIndex(coin => coin.symbol === pending.assets[i].symbol);
            if (coinIndex > -1) {
                coinList.push(coins[coinIndex]);

                cryptoIds.push(cryptoId);

                prices.push(coins[coinIndex].price);

                const quantity = parseFloat(pending.amount) * pending.assets[i].percent / 100 / coins[coinIndex].price;
                quantities.push(quantity);
                quantitiesInWei.push(Web3Service.toWei(quantity));

                amounts.push(coins[coinIndex].price * quantity);
                realAmount += coins[coinIndex].price * quantity;
            }
        }

        const coinSymbols = pending.assets.map(asset => asset.symbol);
        const response = await fetch(`${VERIFY_URI}?cryptos=${coinSymbols.toString()}&amounts=${quantities.toString()}`);
        const json = await response.json();
        for (let i = 0; i < coinSymbols.length; i++) {
            if (parseFloat(json[coinSymbols[i]].amount) < quantities[i]) {
                console.log('purchaseIndex - verify: Amount verify failed.');
                return;
            }
        }

        const amountInWei = Web3Service.toWei((realAmount + 4.99) / coins[coIndex].price);
        if ((new BigNumber(amountInWei)).isGreaterThan(new BigNumber(wallet.quantity))) return;

        order.amount = realAmount;
        order.assets = pending.assets.map((asset, idx) => ({
            symbol: asset.symbol,
            percent: asset.percent,
            price: prices[idx],
            quantity: quantities[idx]
        }));
        order.save(err => {
            if (err) {
                console.log('purchaseIndex: order.save: ', err);
            }
        });

        // Get nonce
        const nonce = new Date().getTime();

        const orders = Orders.find({
            accountId: account._id,
            action: 'Buy',
            status: 'Open',
            txId: null
        }, 'amount', { lean: true }).exec();

        let sendAmount = realAmount + 4.99;
        if (orders && orders.length > 0) {
            orders.forEach(o => {
                sendAmount += o.amount + 4.99;
            });
        }

        const sendAmountInWei = Web3Service.toWei(sendAmount * 1.01 / coins[coIndex].price);

        const approveAndCallSig = Web3Service.encodeFunctionSignature({
            inputs: [
                {
                    name: '_spender',
                    type: 'address'
                },
                {
                    name: '_amount',
                    type: 'uint256'
                },
                {
                    name: '_data',
                    type: 'bytes'
                }
            ],
            name: 'approveAndCall',
            type: 'function'
        });
        const extraData = Web3Service.encodeFunctionCall({
            inputs: [
                {
                    name: '_beneficiary',
                    type: 'address'
                },
                {
                    name: '_cryptoIds',
                    type: 'uint256[]'
                },
                {
                    name: '_amounts',
                    type: 'uint256[]'
                }
            ],
            name: 'buy',
            type: 'function'
        }, [account.beneficiary, cryptoIds, quantitiesInWei]);

        TruffleService.getPreSignedHash(approveAndCallSig, sendAmountInWei, extraData, 40000000000, nonce)
            .then(txHash => {
                const signed = Web3Service.sign(txHash, account.beneficiary, pending.input);
                const tempSign = signed.signature.substr(0, signed.signature.length - 2) + (signed.v === '0x1b' ? '00' : '01');

                TruffleService.approveAndCallPreSigned(tempSign, sendAmountInWei, extraData, 40000000000, nonce)
                    .then(tx => {
                        if (tx.receipt && tx.receipt.transactionHash) {
                            // Update order
                            order.receipt = {
                                ...tx.receipt,
                                timestamp: Math.round((new Date()).getTime() / 1000)
                            };
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

                                index.assets = pending.assets.map((asset, idx) => ({
                                    coinId: coinList[idx]._id,
                                    percentage: asset.percent,
                                    quantity: quantities[idx],
                                    amount: amounts[idx]
                                }));
                                index.save(err => {
                                    if (err) {
                                        console.log('purchaseIndex - save indexAssets: ', err);
                                    }
                                });
                            });
                        } else {
                            console.log('Error receipt: ', tx.receipt);
                        }
                    })
                    .catch(err => {
                        throw (err);
                    });
            })
            .catch(err => {
                console.log('purchaseIndex: ', err);
            });
    } catch (e) {
        console.log('purchaseIndex: ', e);
    }
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
        const quantityInWei = Web3Service.toWei(order.quantity);

        // Get nonce
        const nonce = new Date().getTime();

        const approveAndCallSig = Web3Service.encodeFunctionSignature({
            inputs: [
                {
                    name: '_spender',
                    type: 'address'
                },
                {
                    name: '_amount',
                    type: 'uint256'
                },
                {
                    name: '_data',
                    type: 'bytes'
                }
            ],
            name: 'approveAndCall',
            type: 'function'
        });
        const extraData = Web3Service.encodeFunctionCall({
            inputs: [
                {
                    name: '_beneficiary',
                    type: 'address'
                },
                {
                    name: '_cryptoIds',
                    type: 'uint256[]'
                },
                {
                    name: '_amounts',
                    type: 'uint256[]'
                }
            ],
            name: 'sell',
            type: 'function'
        }, [account.beneficiary, [cryptoId], [quantityInWei]]);

        TruffleService.getPreSignedHash(approveAndCallSig, amountInWei, extraData, 40000000000, nonce)
            .then(txHash => {
                const signed = Web3Service.sign(txHash, account.beneficiary, pending.input);
                const tempSign = signed.signature.substr(0, signed.signature.length - 2) + (signed.v === '0x1b' ? '00' : '01');

                TruffleService.approveAndCallPreSigned(tempSign, amountInWei, extraData, 40000000000, nonce)
                    .then(tx => {
                        if (tx.receipt && tx.receipt.transactionHash) {
                            // Update order
                            order.amount = amount;
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
                        throw (err);
                    });
            })
            .catch(err => {
                console.log('sellAsset: ', err);
            });
    });
};

const sellIndex = (account, order, pending, coins, coIndex) => {
    Indexes.findOne({ accountId: account._id, _id: order.indexId }, async (err, index) => {
        if (err) {
            console.log('sellIndex: findOne: ', err);
            return;
        }

        if (!index) return;

        // Get nonce
        const nonce = new Date().getTime();

        const cryptoIds = [];
        const quantitiesInWei = [];
        let amount = 0;

        if (index.assets && index.assets.length > 0) {
            for (let i = 0; i < index.assets.length; i++) {
                const coinIndex = coins.findIndex(coin => coin._id === index.assets[i].coinId);
                if (coinIndex > -1) {
                    const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === coins[coinIndex].symbol);
                    if (cryptoId === -1) return;

                    cryptoIds.push(cryptoId);
                    quantitiesInWei.push(Web3Service.toWei(index.assets[i].quantity));
                    amount += coins[coinIndex].price * index.assets[i].quantity;
                }
            }
        }

        const amountInWei = Web3Service.toWei((amount + 4.99) / coins[coIndex].price);
        const approveAndCallSig = Web3Service.encodeFunctionSignature({
            inputs: [
                {
                    name: '_spender',
                    type: 'address'
                },
                {
                    name: '_amount',
                    type: 'uint256'
                },
                {
                    name: '_data',
                    type: 'bytes'
                }
            ],
            name: 'approveAndCall',
            type: 'function'
        });
        const extraData = Web3Service.encodeFunctionCall({
            inputs: [
                {
                    name: '_beneficiary',
                    type: 'address'
                },
                {
                    name: '_cryptoIds',
                    type: 'uint256[]'
                },
                {
                    name: '_amounts',
                    type: 'uint256[]'
                }
            ],
            name: 'sell',
            type: 'function'
        }, [account.beneficiary, cryptoIds, quantitiesInWei]);

        TruffleService.getPreSignedHash(approveAndCallSig, amountInWei, extraData, 40000000000, nonce)
            .then(txHash => {
                const signed = Web3Service.sign(txHash, account.beneficiary, pending.input);
                const tempSign = signed.signature.substr(0, signed.signature.length - 2) + (signed.v === '0x1b' ? '00' : '01');

                TruffleService.approveAndCallPreSigned(tempSign, amountInWei, extraData, 40000000000, nonce)
                    .then(tx => {
                        if (tx.receipt && tx.receipt.transactionHash) {
                            // Update order
                            order.amount = amount;
                            order.receipt = {
                                ...tx.receipt,
                                timestamp: Math.round((new Date()).getTime() / 1000)
                            };
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
                        throw (err);
                    });
            })
            .catch(err => {
                console.log('sellIndex: getNonce: ', err);
            });
    });
};

const removePending = orderId => {
    Pending.deleteOne({ orderId }, err => {
        if (err) {
            console.log('removePending: ', err);
        }
    });
};

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

const eventsManager = async () => {
    if (processing) {
        console.log('Still processing...');
        return;
    }

    try {
        let prevBlock = 0;
        let prev = await Blocks.findOne({}).exec();
        if (prev) {
            prevBlock = prev.number;
        }
        // console.log('');
        // console.log('prevBlock: ', prevBlock);

        const coins = await Coins.find({}, null, { lean: true }).exec();
        if (coins && coins.length > 0) {
            const orders = await Orders.find({ status: 'Open', 'receipt.transactionHash': { $ne: null } }).exec();
            if (orders && orders.length > 0) {
                let fromBlock = orders[0].receipt.blockNumber;
                orders.forEach(or => {
                    fromBlock = Math.min(fromBlock, or.receipt.blockNumber);
                });
                fromBlock = Math.max(prevBlock, fromBlock);
                // console.log('fromBlock: ', fromBlock);

                TruffleService.eventsWatch(fromBlock)
                    .then(async events => {
                        try {
                            console.log('Starting ==================================');
                            processing = true;

                            const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
                            const assets = await Assets.find({}).exec();
                            const indexes = await Indexes.find({}).exec();

                            await asyncForEach(orders, async order => {
                                // console.log('Start order: ', order._id);

                                try {
                                    // Expire order if the main transaction is not detected in 30mins
                                    if (new Date().getTime() - new Date(order.updatedAt).getTime() > 1800000) {
                                        order.status = 'Failed';
                                        order.save(err => {
                                            if (err) {
                                                console.log('eventsManager: order.save: ', err);
                                            }
                                        });
                                        return;
                                    }

                                    const ords = await Orders.find({ txId: { $ne: null } }, 'txId', { lean: true }).exec();
                                    for (let i = 0; i < events.length; i++) {
                                        const e = events[i];
                                        if (e.data && e.transactionHash && e.blockNumber >= order.receipt.blockNumber) {
                                            if (
                                                (order.action === 'Buy' && e.topics[0] === '0x6a75660680cd3a8f7f34c5df6451086e3222c8a9e16e568b6e698098e8fd970b')
                                                || (order.action === 'Sell' && e.topics[0] === '0x5e1656ea49c37d58c071f8ec59918a4e2380766f4956535b3724476daad4c4fd')
                                            ) {
                                                let oIdx = -1;
                                                if (ords && ords.length > 0) {
                                                    oIdx = ords.findIndex(ord => ord.txId === e.transactionHash);
                                                }

                                                if (oIdx === -1) {
                                                    const accountIdx = accounts.findIndex(account => account.beneficiary === `0x${e.topics[1].substring(26)}`);
                                                    if (accountIdx > -1 && accounts[accountIdx]._id == order.accountId) {
                                                        let type = 'asset';
                                                        const cryptoIds = [];
                                                        const quantities = [];
                                                        const prices = [];

                                                        const params = e.data.substring(2).match(/.{1,64}/g);
                                                        if (params.length > 3) {
                                                            const cryptoCount = parseInt(hexToDec(params[3]), 10);
                                                            if (cryptoCount > 1) {
                                                                type = 'index';
                                                            }
                                                            for (let i = 4; i < 4 + cryptoCount; i++) {
                                                                cryptoIds.push(parseInt(hexToDec(params[i]), 10));
                                                            }

                                                            const quantityCount = parseInt(hexToDec(params[4 + cryptoCount]), 10);
                                                            for (let i = 5 + cryptoCount; i < 5 + cryptoCount + quantityCount; i++) {
                                                                quantities.push(Web3Service.fromWei(hexToDec(params[i])));
                                                            }

                                                            const priceCount = parseInt(hexToDec(params[5 + cryptoCount + quantityCount]), 10);
                                                            for (let i = 6 + cryptoCount + quantityCount; i < 6 + cryptoCount + quantityCount + priceCount; i++) {
                                                                prices.push(Web3Service.fromWei(hexToDec(params[i])));
                                                            }

                                                            if (type === 'asset' && order.coinId) {
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
                                                                                accountId: order.accountId,
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
                                                                        } else if (assets && assets.length > 0) {
                                                                            const assetIdx = assets.findIndex(a => (a._id == order.assetId && a.accountId == order.accountId));
                                                                            if (assetIdx > -1) {
                                                                                if (assets[assetIdx].quantity === order.quantity) {
                                                                                    // Delete asset in case of selling whole amount of asset
                                                                                    Assets.deleteOne({ _id: assets[assetIdx]._id }, err => {
                                                                                        if (err) {
                                                                                            console.log('eventsManager: Assets.deleteOne: ', err);
                                                                                        }
                                                                                    });
                                                                                } else {
                                                                                    // Update asset amount and quantity
                                                                                    assets[assetIdx].quantity -= order.quantity;
                                                                                    assets[assetIdx].amount -= order.amount;
                                                                                    assets[assetIdx].txId.push(e.transactionHash);
                                                                                    assets[assetIdx].orderType = order.type;
                                                                                    assets[assetIdx].save(err => {
                                                                                        if (err) {
                                                                                            console.log('eventsManager: asset.save: ', err);
                                                                                        }
                                                                                    });
                                                                                }
                                                                            }
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

                                                                        // Remove already detected event
                                                                        events.splice(i, 1);

                                                                        break;
                                                                    }
                                                                }
                                                            }

                                                            if (type === 'index' && order.indexId) {
                                                                if (indexes && indexes.length > 0) {
                                                                    const indexId = indexes.findIndex(idx => (idx._id == order.indexId
                                                                        && idx.accountId === order.accountId && idx.confirmed === (order.action !== 'Buy')));

                                                                    if (indexId > -1) {
                                                                        const index = indexes[indexId];
                                                                        if (indexes[indexId].assets && indexes[indexId].assets.length === cryptoCount) {
                                                                            let match = true;
                                                                            for (let j = 0; j < cryptoIds.length; j++) {
                                                                                const coinIdx = coins.findIndex(coin => coin.symbol === cryptoIdToSymbol[cryptoIds[j]].symbol);
                                                                                if (coinIdx > -1) {
                                                                                    const assetIdx = indexes[indexId].assets.findIndex(ic => ic.coinId == coins[coinIdx]._id &&
                                                                                        parseFloat(ic.quantity).toFixed(8) === parseFloat(quantities[j]).toFixed(8));
                                                                                    if (assetIdx === -1) {
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

                                                                                // Remove already detected event
                                                                                events.splice(i, 1);

                                                                                break;
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        // Update blocknumber in case the latest event does not have block number
                                        if (e.blockNumber) {
                                            fromBlock = Math.max(e.blockNumber, fromBlock);
                                        }
                                    }
                                } catch (err) {
                                    console.log('eventsManager asyncForEach: ', err);
                                }

                                // console.log('End order: ', order._id);
                            });

                            if (prev) {
                                prev.number = fromBlock;
                            } else {
                                prev = new Blocks({
                                    number: fromBlock
                                });
                            }
                            prev.save(err => {
                                if (err) {
                                    console.log('Saving prevBlock: ', err);
                                }
                            });

                            processing = false;
                            console.log('Finished ==================================');
                        } catch (err) {
                            console.log('eventsManager eventsWatch: ', err);
                        }
                    })
                    .catch(err => {
                        console.log('eventsManager eventsWatch: ', err);
                    });
            }
        }
    } catch (err) {
        console.log('eventsManager: ', err);
    }
};


exports.tradeSchedule = () => {
    runOrder();

    eventsMg = schedule.scheduleJob('*/30 * * * * *', eventsManager);
};
