import BigNumber from 'bignumber.js';
import rp from 'request-promise';
import redisClient from '../redis';
import Accounts from '../models/Accounts';
import Assets from '../models/Assets';
import Indexes from '../models/Indexes';
import Wallets from '../models/Wallets';
import Coins from '../models/Coins';
import Orders from '../models/Orders';
import Transactions from '../models/Transactions';

import { web3, getPastBlocks } from '../services/web3Socket';
import TruffleService from '../services/TruffleService';
import { INVESTMENT_CONTRACT_ADDRESS, cryptoIdToSymbolAll } from '../services/Config';

const {
    ETHSCAN_URI,
    ETHSCAN_API_KEY5,
    ETHSCAN_API_KEY6
} = process.env;

const { logger } = require('../services/logger');

export const scanPastTradeEvents = async () => {
    logger.log('info', { label: 'FailedOrderDaemon', message: 'Scanning Past Trade Events to audit failed orders' });

    // check count of failed orders FIRST
    const failedOrdersCount = await Orders.count({status: 'Failed'}).exec();

    if (failedOrdersCount) {
        // get last block number of Trade events from redis
        let lastBlockNumber = await redisClient.getAsync('eth:order:last-block');
        lastBlockNumber = lastBlockNumber || 0;

        // check with latest blocknumber of blockchain
        const latestBlockNumber = await web3.eth.getBlockNumber();
        if (lastBlockNumber < latestBlockNumber) {
            const requestOptions = {
                method: 'GET',
                json: true,
                gzip: true
            };

            // fetch all transaction between last block to latest block
            requestOptions.uri = `${ETHSCAN_URI}&action=txlist&startblock=${lastBlockNumber + 1}&endblock=latest&sort=desc&apikey=${ETHSCAN_API_KEY6}&address=${INVESTMENT_CONTRACT_ADDRESS}`;
            const ethResponse = await rp(requestOptions);

            if (ethResponse.status == '1') {
                const ethTx = ethResponse.result;

                // first set largest block number to redis to prevent duplicated work
                const maxBlockNumber = Math.max.apply(Math, ethTx.map(tx => parseInt(tx.blockNumber, 10)));

                logger.log('info', { label: 'FailedOrderDaemon', message: `Set last blocknumber of Trade events: ${maxBlockNumber}` });
                await redisClient.setAsync('eth:order:last-block', maxBlockNumber.toString());

                let tradeEvents = [];
                await Promise.all(ethTx.map(async tx => {
                    const txReceipt = await web3.eth.getTransactionReceipt(tx.hash);
                    if (txReceipt && txReceipt.logs.length > 0) {
                        // filter out event logs into different types by topics[0]
                        const filtered = txReceipt.logs.filter(log => log.topics.length > 0 &&
                            (log.topics[0] == '0xc3c453ebab7c6d8207cc1e5359910b016ee5fa74282e0d385824e6595ae13aab' ||
                                log.topics[0] == '0x934e9fcb0e8bcba1ad2d44addbc61ca08e7a4c6d7aa069c11f62e72ddc81b2d3' ||
                                log.topics[0] == '0x6a75660680cd3a8f7f34c5df6451086e3222c8a9e16e568b6e698098e8fd970b' ||
                                log.topics[0] == '0x5e1656ea49c37d58c071f8ec59918a4e2380766f4956535b3724476daad4c4fd'));

                        if (filtered.length > 0) {
                            tradeEvents = tradeEvents.concat(filtered);
                        }
                    }
                }));

                if (tradeEvents.length) {
                    logger.log('info', { label: 'FailedOrderDaemon', message: `Fetched ${tradeEvents.length} new Trade events from block ${lastBlockNumber}` });
                    handlePastTradeEvents(tradeEvents);
                } else {
                    logger.log('info', { label: 'FailedOrderDaemon', message: 'No new trade events found on blockchain' });
                }
            } else {
                logger.log('info', { label: 'FailedOrderDaemon', message: `Response from Etherscan: ${ethResponse.message}` });
            }
        }
    } else {
        logger.log('info', { label: 'FailedOrderDaemon', message: 'No failed orders found' });
    }

    // re-run after 1 hour
    setTimeout(scanPastTradeEvents, 3600000);
};

const handlePastTradeEvents = async events => {
    // find necessary data
    const coins = await Coins.find({}, null, {lean: true}).exec();
    const failedOrders = await Orders.find({status: 'Failed'}).exec();
    const assets = await Assets.find({}).exec();
    const indexes = await Indexes.find({}).exec();

    if (failedOrders.length === 0) {
        logger.log('info', { label: 'FailedOrderDaemon', message: 'No failed orders found' });
        return;
    }
    logger.log('info', { label: 'FailedOrderDaemon', message: `Found ${failedOrders.length} failed orders` });

    // iterate all events
    return Promise.all(events.map(async event => {
        const queryId = event.topics[1];

        // check if the event was already handled
        const existingOrder = queryId ? await Orders.findOne({status: 'Filled', queryId: queryId.toString()}).exec() : null;

        if (!existingOrder) {
            try {
                let matchedOrder = null;
                if (queryId) {
                    matchedOrder = await Orders.findOne({status: 'Failed', queryId: queryId.toString()}).exec();
                }

                if (!matchedOrder) {
                    // find order manually
                    let eventType = null;
                    if (event.topics[0] == '0x934e9fcb0e8bcba1ad2d44addbc61ca08e7a4c6d7aa069c11f62e72ddc81b2d3' || event.topics[0] == '0x6a75660680cd3a8f7f34c5df6451086e3222c8a9e16e568b6e698098e8fd970b') eventType = 'Buy';
                    else if (event.topics[0] == '0xc3c453ebab7c6d8207cc1e5359910b016ee5fa74282e0d385824e6595ae13aab' || event.topics[0] == '0x5e1656ea49c37d58c071f8ec59918a4e2380766f4956535b3724476daad4c4fd') eventType = 'Sell';

                    let tradeType = 'asset';
                    const tradeAddress = `0x${event.topics[2].substring(26)}`;
                    const decodedParams = web3.eth.abi.decodeParameters(['uint256[]', 'uint256[]', 'uint256[]', 'bool'], event.data);
                    const cryptoIds = decodedParams[0].map(id => parseInt(id, 10)) || [];
                    const quantities = decodedParams[1].map(amount => web3.utils.fromWei(amount, 'ether').toString()) || [];
                    const prices = decodedParams[2].map(price => price.toString()) || [];
                    if (cryptoIds.length > 1) {
                        tradeType = 'index';
                    }

                    const cryptoIdToSymbols = await cryptoIdToSymbolAll();

                    // compare with all failed orders
                    failedOrders.forEach(order => {
                        if (tradeType === 'asset' && order.coinId) {
                            const crypto = cryptoIdToSymbols.find(item => item.id == cryptoIds[0]);
                            if (crypto) {
                                const matchedCoin = coins.find(item => item.symbol === crypto.symbol);
                                if (matchedCoin && matchedCoin._id == order.coinId && parseFloat(order.quantity).toFixed(8) === parseFloat(quantities[0]).toFixed(8)) {
                                    matchedOrder = order;
                                }
                            }
                        } else if (tradeType === 'index' && order.indexId) {
                            const index = indexes.find(item => item._id == order.indexId);

                            if (index && index.assets && index.assets.length == cryptoIds.length) {
                                let match = true;
                                for (let i = 0; i < cryptoIds.length; i++) {
                                    const crypto = cryptoIdToSymbols.find(item => item.id == cryptoIds[i]);
                                    if (crypto) {
                                        const matchedCoin = coins.find(item => item.symbol === crypto.symbol);
                                        if (matchedCoin) {
                                            const asset = index.assets.find(item => item.coinId == matchedCoin._id && parseFloat(item.quantity).toFixed(8) === parseFloat(quantities[i]).toFixed(8));
                                            if (!asset) {
                                                match = false;
                                                break;
                                            }
                                        } else {
                                            match = false;
                                        }
                                    } else {
                                        match = false;
                                    }
                                }

                                if (match) matchedOrder = order;
                            }
                        }
                    });
                }

                // update matched order as Filled
                if (!matchedOrder) return;

                // log
                logger.log('info', { label: 'FailedOrderDaemon', message: `Found matched failed orderId: ${matchedOrder._id} for the trade event from txHash: ${event.transactionHash}, processing...` });

                matchedOrder.txId = event.transactionHash;
                matchedOrder.status = 'Filled';
                await matchedOrder.save();

                // update asset or index
                if (matchedOrder.coinId && !matchedOrder.indexId) {
                    if (matchedOrder.action === 'Buy') {
                        const asset = new Assets({
                            accountId: matchedOrder.accountId,
                            coinId: matchedOrder.coinId,
                            quantity: matchedOrder.quantity,
                            amount: matchedOrder.amount,
                            orderType: matchedOrder.type,
                            txId: [event.transactionHash],
                            timestamp: Math.round((new Date()).getTime() / 1000)
                        });

                        await asset.save();
                    } else {
                        const asset = assets.find(item => item._id == matchedOrder.assetId && item.accountId == matchedOrder.accountId);
                        if (asset) {
                            if (asset.quantity == matchedOrder.quantity) {
                                // await asset.remove();
                            } else {
                                asset.quantity -= matchedOrder.quantity;
                                asset.amount -= matchedOrder.amount;
                                asset.txId.push(event.transactionHash);
                                asset.orderType = matchedOrder.type;
                                await asset.save();
                            }
                        }
                    }
                } else if (matchedOrder.indexId) {
                    const index = indexes.find(item => item._id == matchedOrder.indexId);
                    if (matchedOrder.action === 'Buy') {
                        index.txId = [event.transactionHash];
                        index.confirmed = true;
                        // await index.save();
                    } else {
                        index.txId.push(event.transactionHash);
                        index.confirmed = false;
                        await index.save();
                    }
                }

                // add new transactions
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

                await transaction.save();
            } catch (error) {
                logger.log('error', { label: 'FailedOrderDaemon', message: `Error proccessing failed orders: ${error}` });
            }
        }

        return true;
    }));
};

export const auditAssetHoldings = async () => {
    // todo
    const orders = await Orders.find({}).exec();
    const accountIds = orders.map(order => order.accountId);
    const accounts = await Accounts.find({_id: accountIds}, 'beneficiary', {lean: true}).exec();
    await Promise.all(orders.map(async order => {
        const account = accounts.find(item => item._id == order.accountId);
        if (!account) return;

        const holdings = await TruffleService.getUserHoldings(account.beneficiary);

        return true;
    }));
};
