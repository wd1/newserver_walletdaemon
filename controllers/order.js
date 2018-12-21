import BigNumber from 'bignumber.js';

import Accounts from '../models/Accounts';
import Assets from '../models/Assets';
import Indexes from '../models/Indexes';
import Wallets from '../models/Wallets';
import Coins from '../models/Coins';
import Orders from '../models/Orders';
import Transactions from '../models/Transactions';
import Pending from '../models/Pending';
import Blocks from '../models/Blocks';

import { cryptoIdToSymbol, VERIFY_URI } from '../services/Config';
import { hexToDec } from '../services/hex2dec';
import Web3Service from '../services/Web3Service';
import TruffleService from '../services/TruffleService';

const purchaseAsset = (account, order, pending, coins, coIndex, wallet) => new Promise((resolve, reject) => {
    const coinIndex = coins.findIndex(coin => coin._id == order.coinId);
    if (coinIndex === -1) {
        console.log('purchaseAsset: no coin found');
        resolve(false);
    }

    const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === coins[coinIndex].symbol);
    if (cryptoId === -1) resolve(false);

    if (order.type === 'limit' && order.price < coins[coinIndex].price) resolve(false);

    const amount = coins[coinIndex].price * order.quantity;
    const amountInWei = Web3Service.toWei((amount + 4.99) / coins[coIndex].price);

    // Get quantity in Wei
    const quantityInWei = Web3Service.toWei(order.quantity);

    if ((new BigNumber(amountInWei)).isGreaterThan(new BigNumber(wallet.quantity))) resolve(false);

    // Get nonce
    const nonce = new Date().getTime();

    Orders.find({
        accountId: account._id,
        action: 'Buy',
        status: 'Open',
        txId: null
    }, 'amount', { lean: true }, (err, orders) => {
        if (err) {
            console.log('purchaseAsset: Orders.find: ', err);
            resolve(false);
        }

        let sendAmount = amount;
        orders.forEach(o => {
            sendAmount += o.amount + 4.99;
        });

        const sendAmountInWei = Web3Service.toWei((sendAmount + 4.99) / coins[coIndex].price);

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
                                    resolve(false);
                                }

                                resolve(true);
                            });
                        } else {
                            console.log('Error receipt: ', tx.receipt);
                            resolve(false);
                        }
                    })
                    .catch(err => {
                        resolve(false);
                    });
            })
            .catch(err => {
                console.log('purchaseAsset: ', err);
                resolve(false);
            });
    });
});

const sellAsset = (account, order, pending, coins, coIndex) => new Promise((resolve, reject) => {
    const coinIndex = coins.findIndex(coin => coin._id == order.coinId);
    if (coinIndex === -1) {
        console.log('sellAsset: no coin found');
        resolve(false);
    }

    const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === coins[coinIndex].symbol);
    if (cryptoId === -1) resolve(false);

    if (order.type === 'limit' && order.price < coins[coinIndex].price) resolve(false);

    Assets.findOne({ _id: pending.assetId, accountId: account._id }, (err, asset) => {
        if (err) {
            console.log('sellAsset: Assets.findOne: ', err);
            resolve(false);
        }

        if (!asset || asset.quantity < order.quantity) resolve(false);

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
                                    resolve(false);
                                }
                                resolve(true);
                            });
                        } else {
                            console.log('Error receipt: ', tx.receipt);
                            resolve(false);
                        }
                    })
                    .catch(err => {
                        resolve(false);
                    });
            })
            .catch(err => {
                console.log('sellAsset: ', err);
                resolve(false);
            });
    });
});

const purchaseIndex = (account, order, pending, coins, coIndex, wallet) => new Promise((resolve, reject) => {
    Indexes.findOne({ accountId: account._id, _id: order.indexId }, async (err, index) => {
        if (err) {
            console.log('purchaseIndex: findOne: ', err);
            resolve(false);
        }

        if (!index) resolve(false);

        const cryptoIds = [];
        const prices = [];
        const quantities = [];
        const quantitiesInWei = [];
        const coinList = [];
        const amounts = [];
        let realAmount = 0;

        for (let i = 0; i < pending.assets.length; i++) {
            const cryptoId = cryptoIdToSymbol.findIndex(crypto => crypto.symbol === pending.assets[i].symbol);
            if (cryptoId === -1) resolve(false);

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

        const amountInWei = Web3Service.toWei((realAmount + 4.99) / coins[coIndex].price);
        if ((new BigNumber(amountInWei)).isGreaterThan(new BigNumber(wallet.quantity))) resolve(false);

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
                resolve(false);
            }
        });

        // Get nonce
        const nonce = new Date().getTime();

        Orders.find({
            accountId: account._id,
            action: 'Buy',
            status: 'Open',
            txId: null
        }, 'amount', { lean: true }, (err, orders) => {
            if (err) {
                console.log('purchaseIndex: Orders.find: ', err);
                resolve(false);
            }

            let sendAmount = realAmount;
            orders.forEach(o => {
                sendAmount += o.amount + 4.99;
            });

            const sendAmountInWei = Web3Service.toWei((sendAmount + 4.99) / coins[coIndex].price);

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
                                        resolve(false);
                                    }
                                });

                                index.amount = realAmount;
                                index.assets = pending.assets.map((asset, idx) => ({
                                    coinId: coinList[idx]._id,
                                    percentage: asset.percent,
                                    quantity: quantities[idx],
                                    amount: amounts[idx]
                                }));

                                index.save(err => {
                                    if (err) {
                                        console.log('purchaseIndex: index.save: ', err);
                                        resolve(false);
                                    }

                                    resolve(true);
                                });
                            } else {
                                console.log('Error receipt: ', tx.receipt);
                                resolve(false);
                            }
                        })
                        .catch(err => {
                            resolve(false);
                        });
                })
                .catch(err => {
                    console.log('purchaseIndex: ', err);
                    resolve(false);
                });
        });
    });
});

const sellIndex = (account, order, pending, coins, coIndex) => new Promise((resolve, reject) => {
    Indexes.findOne({ accountId: account._id, _id: order.indexId }, async (err, index) => {
        if (err) {
            console.log('sellIndex: findOne: ', err);
            resolve(false);
        }

        if (!index) resolve(false);

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
                                    resolve(false);
                                }

                                resolve(true);
                            });
                        } else {
                            console.log('Error receipt: ', tx.receipt);
                            resolve(false);
                        }
                    })
                    .catch(err => {
                        resolve(false);
                    });
            })
            .catch(err => {
                console.log('sellIndex: getNonce: ', err);
                resolve(false);
            });
    });
});

export const runPendingOrdersTask = async () => {
    console.log(`\n------------- Processing Pending Orders ------------`);


    const coins = await Coins.find({}, 'symbol price', {lean: true});
    const coinIdx = coins.findIndex(coin => coin.symbol === 'COIN');
    const accounts = await Accounts.find({}, 'beneficiary', {lean: true});
    const wallets = await Wallets.find({}, 'quantity', {lean: true});

    const openOrders = await Orders.find({status: 'Open', 'receipt.transactionHash': null});
    if (!!openOrders || openOrders.length === 0) {
        console.log(`[TradeDaemon] No new open orders found..`);
        return;
    }

    try {
        await Promise.all(openOrders.map(async order => {
            if (order.type === 'limit' && order.timing === 'day') {
                const current = Math.round((new Date()).getTime() / 1000);
                if (current - order.timestamp > 86400) {
                    order.status = 'Cancelled';
                    console.log(`[TradeDaemon] Expired an order: ${order._id}`);
                    await Pending.deleteOne({orderId: order._id});
                    return order.save();
                }
            }

            if (new Date().getTime() - new Date(order.updatedAt).getTime() > 1800000) {
                order.status = 'Failed';
                console.log(`[TradeDaemon] Failed order: ${order._id}`);
                return order.save();
            }

            const pendingOrder = await Pending.findOne({orderId: order._id});
            if (!pendingOrder) {
                console.log(`[TradeDaemon] No pending orders founds`);
                return true;
            }

            const accountIdx = accounts.findIndex(account => account._id === order.accountId);
            const walletIdx = wallets.findIndex(wallet => wallet.accountId === accounts[accountIdx]._id && wallet.coinId === coins[coinIdx]._id);
            switch (pendingOrder.type) {
                case 'purchaseAsset':
                    return purchaseAsset(accounts[accountIdx], order, pendingOrder, coins, coinIdx, wallets[walletIdx]);
                case 'purchaseIndex':
                    return purchaseIndex(accounts[accountIdx], order, pendingOrder, coins, coinIdx, wallets[walletIdx]);
                case 'sellAsset':
                    return sellAsset(accounts[accountIdx], order, pendingOrder, coins, coinIdx);
                case 'sellIndex':
                    return sellIndex(accounts[accountIdx], order, pendingOrder, coins, coinIdx);
                default:
                    break;
            }
        }));
    } catch (error) {
        console.log(`[TradeDaemon] Error handling pending orders; ${error}`);
    }

    // run after 1 min
    setTimeout(runPendingOrdersTask, 60000);
};

