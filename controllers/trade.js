import BigNumber from 'bignumber.js';

import Accounts from '../models/Accounts';
import Assets from '../models/Assets';
import Indexes from '../models/Indexes';
import Wallets from '../models/Wallets';
import Coins from '../models/Coins';
import Orders from '../models/Orders';
import Transactions from '../models/Transactions';
import Pending from '../models/Pending';
import IndexContains from '../models/IndexContains';
import Blocks from '../models/Blocks';

import { cryptoIdToSymbol } from '../services/Config';
import { hexToDec } from '../services/hex2dec';
import { web3, subscribeToTradeEvents } from '../services/web3Socket';

export const handleIncomingTradeEvents = async () => {
    subscribeToTradeEvents(async events => {
        const coins = await Coins.find({}, null, { lean: true }).exec();
        const openOrders = await Orders.find({ status: 'Open', 'receipt.transactionHash': { $ne: null } }).exec();
        const filledOrders = await Orders.find({ txId: {$ne: null} }, 'txId', {lean: true});
        const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
        const assets = await Assets.find({}).exec();
        const indexes = await Indexes.find({}).exec();
        const idxContains = await IndexContains.find({}, null, { lean: true }).exec();

        if (openOrders && openOrders.length > 0) {
            await Promise.all(events.map(async event => {
                try {
                    let tradeType = 'asset';
                    const tradeAddress = `0x${event.topics[1].substring(26)}`;
                    const params = event.data.substring(2).match(/.{1,64}/g);
                    const filledOrder = filledOrders && filledOrders.length ? filledOrders.findIndex(order => order.txId === event.transactionHash) : -1;
                    const accountId = accounts.find(account => account.beneficiary === tradeAddress);
                    const cryptoIds = [];
                    const quantities = [];
                    const prices = [];

                    if (filledOrder === -1 && accountId) {
                        if (params.length > 3) {
                            const cryptoCount = parseInt(hexToDec(params[3]), 10);
                            if (cryptoCount > 1) {
                                tradeType = 'index';
                            }

                            for (let i = 4; i < 4 + cryptoCount; i++) {
                                cryptoIds.push(parseInt(hexToDec(params[i]), 10));
                            }

                            const quantityCount = parseInt(hexToDec(params[4 + cryptoCount]), 10);
                            for (let i = 5 + cryptoCount; i < 5 + cryptoCount + quantityCount; i++) {
                                quantities.push(web3.fromWei(hexToDec(params[i])));
                            }

                            const priceCount = parseInt(hexToDec(params[5 + cryptoCount + quantityCount]), 10);
                            for (let i = 6 + cryptoCount + quantityCount; i < 6 + cryptoCount + quantityCount + priceCount; i++) {
                                prices.push(web3.fromWei(hexToDec(params[i])));
                            }

                            if (tradeType === 'asset') {
                                const coinId = coins.find(coin => coin.symbol === cryptoIdToSymbol[cryptoIds[0]].symbol);
                                if (coinId) {
                                    const order = openOrders.find(order =>
                                        order.coinId === coinId &&
                                        order.accountId === accountId &&
                                        parseFloat(order.quantity).toFixed(8) === parseFloat(quantities[0]).toFixed(8) &&
                                        ((order.action === 'Buy' && event.topics[0] === '0x6a75660680cd3a8f7f34c5df6451086e3222c8a9e16e568b6e698098e8fd970b')
                                        || (order.action === 'Sell' && event.topics[0] === '0x5e1656ea49c37d58c071f8ec59918a4e2380766f4956535b3724476daad4c4fd'))
                                    );

                                    order.txId = event.transactionHash;
                                    order.status = 'Filled';
                                    await order.save();

                                    if (order.action === 'Buy') {
                                        const asset = new Assets({
                                            accountId: order.accountId,
                                            coinId: order.coinId,
                                            quantity: order.quantity,
                                            amount: order.amount,
                                            orderType: order.type,
                                            txId: [e.transactionHash],
                                            timestamp: Math.round((new Date()).getTime() / 1000)
                                        });

                                        await asset.save();
                                    } else if (assets && assets.length > 0) {
                                        const existAsset = assets.find(a => (a._id == order.assetId && a.accountId == order.accountId));
                                        if (existAsset) {
                                            // Delete asset in case of selling whole amount of asset
                                            if (existAsset.quantity === order.quantity) {
                                                await existAsset.remove();
                                            } else {
                                                // Update asset amount and quantity
                                                existAsset.quantity -= order.quantity;
                                                existAsset.amount -= order.amount;
                                                existAsset.txId.push(event.transactionHash);
                                                existAsset.orderType = order.type;
                                                await existAsset.save();
                                            }
                                        }
                                    }

                                    // Create transaction
                                    const transaction = new Transactions({
                                        orderId: order._id,
                                        blockHash: event.blockHash,
                                        blockNumber: event.blockNumber,
                                        contractAddress: order.receipt.contractAddress,
                                        cumulativeGasUsed: order.receipt.cumulativeGasUsed,
                                        gasUsed: order.receipt.gasUsed,
                                        from: order.receipt.from,
                                        to: order.receipt.to,
                                        status: order.receipt.status,
                                        transactionHash: event.transactionHash,
                                        transactionIndex: event.transactionIndex
                                    });

                                    await Pending.deleteOne({orderId: order._id});
                                    return transaction.save();
                                }
                            } else if (tradeType === 'index') {
                                const matchedOrder = openOrders.find(order => {
                                    if (!order.indexId) return false;
                                    const index = indexes.find(idx =>
                                        idx._id === order.indexId &&
                                        idx.accountId === order.account &&
                                        idx.confirmed === (order.action !== 'Buy'));

                                    if (index) {
                                        const indexContains = idxContains.filter(indexContain => indexContain.indexId === index._id);
                                        if (indexContains && indexContains.length === cryptoCount) {
                                            let match = true;
                                            for (let i = 0; i < cryptoIds.length; i++) {
                                                const coin = coins.find(coin => coin.symbol === cryptoIdToSymbol[cryptoIds[i]].symbol);
                                                if (coin) {
                                                    const idxContain = indexContains.find(ic => ic.coinId == coin._id && parseFloat(ic.quantity).toFixed(8) === parseFloat(quantities[j]).toFixed(8));
                                                    match = !!idxContain;
                                                    if (!idxContain) break;
                                                }
                                            }

                                            return match;
                                        }
                                    }
                                    return false;
                                });

                                if (matchedOrder) {
                                    const matchedIndex = indexes.find(idx =>
                                        idx._id === matchedOrder.indexId &&
                                        idx.accountId === matchedOrder.account &&
                                        idx.confirmed === (matchedOrder.action !== 'Buy'));

                                    matchedOrder.txId = event.transactionHash;
                                    matchedOrder.status = 'Filled';
                                    await matchedOrder.save();

                                    if (matchedOrder.action === 'Buy') {
                                        matchedIndex.txId = [event.transactionHash];
                                        matchedIndex.confirmed = true;
                                    } else {
                                        matchedIndex.txId.push(event.transactionHash);
                                        matchedIndex.confirmed = true;
                                    }

                                    await matchedIndex.save();

                                    // create transaction
                                    const transaction = new Transactions({
                                        orderId: matchedOrder._id,
                                        blockHash: event.blockHash,
                                        blockNumber: event.blockNumber,
                                        contractAddress: matchedOrder.receipt.contractAddress,
                                        cumulativeGasUsed: matchedOrder.receipt.cumulativeGasUsed,
                                        gasUsed: matchedOrder.receipt.gasUsed,
                                        from: matchedOrder.receipt.from,
                                        to: matchedOrder.receipt.to,
                                        status: matchedOrder.receipt.status,
                                        transactionHash: event.transactionHash,
                                        transactionIndex: event.transactionIndex
                                    });

                                    await Pending.deleteOne({orderId: matchedOrder._id});
                                    return transaction.save();
                                }
                            }
                        }
                    }

                } catch (error) {
                    console.log(`[TradeDaemon] Error handling Trade events: ${error}`);
                }
            }));
        }
    });
};
