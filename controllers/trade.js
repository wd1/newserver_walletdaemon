import BigNumber from 'bignumber.js';
import _ from 'lodash';
import Accounts from '../models/Accounts';
import Assets from '../models/Assets';
import Indexes from '../models/Indexes';
import Wallets from '../models/Wallets';
import Coins from '../models/Coins';
import Orders from '../models/Orders';
import Transactions from '../models/Transactions';
import Pending from '../models/Pending';
import Blocks from '../models/Blocks';

import { cryptoIdToSymbol } from '../services/Config';
import { hexToDec } from '../services/hex2dec';
import { web3 } from '../services/web3Socket';

export const handleNewOraclizeEvents = async events => {
    // log
    console.log(`\n[NewOraclizeEventSubscriber] NewOraclizeQuery Event Detected.`);

    events.forEach(async event => {
        const params = event.data.substring(2).match(/.{1,64}/g);
        if (params.length > 3) {
            const hash = `0x${params[1]}`;
            const queryId = `0x${params[2]}`;

            try {
                const order = await Orders.findOne({ status: 'Open', inputHash: hash, queryId: undefined }).exec();
                if (order) {
                    order.queryId = queryId;
                    await order.save();
                }
            } catch (error) {
                console.log(`[TradeDaemon] Error updating order with queryId: ${error}`);
            }
        }
    });
};


export const handleTradeEvents = async events => {
    // log
    console.log(`\n[TradeEventSubscriber] New Trade Events Detected.`);

    events.forEach(async event => {
        const queryId = event.topics[1];
        const coins = await Coins.find({}, null, { lean: true }).exec();
        const order = await Orders.findOne({ status: 'Open', queryId }).exec();
        const assets = await Assets.find({}).exec();
        const indexes = await Indexes.find({}).exec();

        try {
            let tradeType = 'asset';
            const tradeAddress = `0x${event.topics[2].substring(26)}`;
            const params = event.data.substring(2).match(/.{1,64}/g);
            const cryptoIds = [];
            const quantities = [];
            const prices = [];

            if (order && params.length > 3) {
                const cryptoCount = parseInt(hexToDec(params[3]), 10);
                if (cryptoCount > 1) {
                    tradeType = 'index';
                }

                for (let i = 4; i < 4 + cryptoCount; i++) {
                    cryptoIds.push(parseInt(hexToDec(params[i]), 10));
                }

                const quantityCount = parseInt(hexToDec(params[4 + cryptoCount]), 10);
                for (let i = 5 + cryptoCount; i < 5 + cryptoCount + quantityCount; i++) {
                    quantities.push(web3.utils.fromWei(hexToDec(params[i])));
                }

                const priceCount = parseInt(hexToDec(params[5 + cryptoCount + quantityCount]), 10);
                for (let i = 6 + cryptoCount + quantityCount; i < 6 + cryptoCount + quantityCount + priceCount; i++) {
                    prices.push(web3.utils.fromWei(hexToDec(params[i])));
                }

                if (tradeType === 'asset') {
                    const coin = coins.find(coin => coin.symbol === cryptoIdToSymbol[cryptoIds[0]].symbol);
                    if (coin) {
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
                                txId: [event.transactionHash],
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
                    const matchedIndex = indexes.find(idx =>
                        idx._id == order.indexId &&
                        idx.accountId == order.account &&
                        idx.confirmed === (order.action !== 'Buy'));

                    order.txId = event.transactionHash;
                    order.status = 'Filled';
                    await order.save();

                    if (order.action === 'Buy') {
                        matchedIndex.txId = [event.transactionHash];
                        matchedIndex.confirmed = true;
                    } else {
                        matchedIndex.txId.push(event.transactionHash);
                        matchedIndex.confirmed = true;
                    }

                    await matchedIndex.save();

                    // create transaction
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
            }
        } catch (error) {
            console.log(`[TradeDaemon] Error handling Trade events: ${error}`);
        }
    });
};
