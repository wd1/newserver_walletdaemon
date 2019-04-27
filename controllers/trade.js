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
import { cryptoIdToSymbolAll } from '../services/Config';
import { hexToDec } from '../services/hex2dec';
import { web3 } from '../services/web3Socket';

const { logger } = require('../services/logger');

export const handleNewOraclizeEvents = async events => {
    logger.log('info', { label: 'NewOraclizeEventSubscriber', message: 'NewOraclizeQuery Events Detected.' });
    logger.log('info', { label: 'NewOraclizeEventSubscriber', message: `\nNewOraclizeEvents:\n${JSON.stringify(events, undefined, 4)}` });

    events.forEach(async event => {
        const decodedParams = web3.eth.abi.decodeParameters(['string', 'bytes32', 'bytes32'], event.data);
        if (Object.keys(decodedParams).length > 2) {
            const hash = decodedParams[1];
            const queryId = decodedParams[2];

            logger.log('info', { label: 'NewOraclizeEventSubscriber', message: `\nDecodedParams: [message] [InputHash] [QueryId]\n${JSON.stringify(decodedParams, undefined, 4)}` });

            try {
                const order = await Orders.findOne({ status: 'Open', inputHash: hash, 'receipt.transactionHash': event.transactionHash }).exec();
                if (order) {
                    order.queryId = queryId;
                    await order.save();
                } else {
                    // TODO We need a better appraoch to handle orders not found on first query attempt
                    const order = await Orders.findOne({ status: 'Open', inputHash: hash, 'receipt.transactionHash': event.transactionHash }).exec();
                    if (order) {
                        order.queryId = queryId;
                        await order.save();
                    } else {
                        logger.log('error', { label: 'NewOraclizeEventSubscriber', message: `Order with transactionHash: ${event.transactionHash} was not found.` });
                    }
                }
            } catch (error) {
                logger.log('error', { label: 'NewOraclizeEventSubscriber', message: `Error updating order with queryId: ${error}` });
            }
        }
    });
};

export const handleTradeEvents = async events => {
    logger.log('info', { label: 'TradeEventSubscriber', message: 'New Trade Events Detected.' });

    const cryptoIdToSymbols = await cryptoIdToSymbolAll();

    events.forEach(async event => {
        const queryId = event.topics[1];
        if (!queryId) return;

        logger.log('info', { label: 'TradeEventSubscriber', message: `\nTradeEvent:\n${JSON.stringify(event, undefined, 4)}` });
        logger.log('info', { label: 'TradeEventSubscriber', message: `QueryId: ${queryId}` });

        const coins = await Coins.find({}, null, { lean: true }).exec();
        const order = await Orders.findOne({ status: 'Open', queryId: queryId.toString() }).exec();
        const assets = await Assets.find({}).exec();
        const indexes = await Indexes.find({}).exec();

        logger.log('info', { label: 'TradeEventSubscriber', message: `\nMatched Order:\n${JSON.stringify(order, undefined, 4)}` });

        try {
            let tradeType = 'asset';
            const tradeAddress = `0x${event.topics[2].substring(26)}`;
            const decodedParams = web3.eth.abi.decodeParameters(['uint256[]', 'uint256[]', 'uint256[]', 'bool'], event.data);

            logger.log('info', { label: 'TradeEventSubscriber', message: `\nDecodedParams: [AssetId] [Qty] []\n${JSON.stringify(decodedParams, undefined, 4)}` });

            if (order && Object.keys(decodedParams).length > 3) {
                logger.log('info', { label: 'TradeEventSubscriber', message: `Found order ${queryId}` });

                const cryptoIds = decodedParams[0].map(id => parseInt(id, 10));

                if (cryptoIds.length > 1) {
                    tradeType = 'index';
                }

                if (tradeType === 'asset') {
                    const crypto = cryptoIdToSymbols.find(item => item.id === cryptoIds[0]);
                    const coin = crypto ? coins.find(coin => coin.symbol === crypto.symbol) : null;
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
                    const matchedIndex = indexes.find(idx => idx._id == order.indexId);

                    logger.log('info', { label: 'TradeEventSubscriber', message: `Matched Index: ${matchedIndex}` });

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
            logger.log('error', { label: 'TradeEventSubscriber', message: `Error handling Trade events: ${error}` });

        }
    });
};
