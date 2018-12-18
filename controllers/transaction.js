import rp from 'request-promise';
import Accounts from '../models/Accounts';
import Wallets from '../models/Wallets';
import Coins from '../models/Coins';
import TokenTransactions from '../models/TokenTransactions';
import { web3, startSyncingBlocks } from '../services/web3Socket';
import { handleNewOraclizeEvents, handleTradeEvents } from './trade';
import {
    CMC_API_SECRET, COINVEST_TOKEN_ADDRESS,
    COINVEST_TOKEN_ADDRESS_V1,
    COINVEST_TOKEN_ADDRESS_V3, tokenList
} from '../services/Config';

const {
    ETHSCAN_URI,
    ETHSCAN_API_KEY5,
    ETHSCAN_API_KEY6
} = process.env;

const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Daemon that synchronize user transaction history from etherscan
 *
 * @returns {Promise<void>}
 */
export const syncTransactionTask = async () => {
    console.log(`------------- Synchronizing Transactions from Etherscan ----------`);

    try {
        const requestOptions = {
            method: 'GET',
            json: true,
            gzip: true
        };

        const coin = await Coins.findOne({ symbol: 'ETH' }, 'symbol', { lean: true }).exec();
        const coins = await Coins.find({}, 'symbol', { lean: true }).exec();
        const accounts = await Accounts.find({txSynced: {$ne: true}, beneficiary: {$exists: true}}).exec();

        for (const account of accounts) {
            try {
                requestOptions.uri = `${ETHSCAN_URI}&action=txlist&startblock=0&endblock=latest&sort=desc&apikey=${ETHSCAN_API_KEY5}&address=${account.beneficiary}`;
                const ethResponse = await rp(requestOptions);

                if (ethResponse.status !== '1') {
                    if (ethResponse.status === '0') {
                        account.txSynced = true;
                        await account.save();
                    }
                    return;
                }
                const ethTx = ethResponse.result;

                requestOptions.uri = `${ETHSCAN_URI}&action=tokentx&startblock=0&endblock=latest&sort=desc&apikey=${ETHSCAN_API_KEY6}&address=${account.beneficiary}`;
                const tokenResponse = await rp(requestOptions);

                if (tokenResponse.status !== '1') {
                    if (tokenResponse.status === '0') {
                        account.txSynced = true;
                        await account.save();
                    }
                    return;
                }
                const tokenTx = tokenResponse.result;

                ethTx.forEach(async tx => {
                    let action = '';
                    if (tx.from === account.beneficiary) {
                        action = 'send';
                    } else if (tx.to === account.beneficiary) {
                        action = 'receive';
                    }

                    let tokenTx = await TokenTransactions.findOne({
                        accountId: account._id,
                        txId: tx.hash
                    });

                    if (!tokenTx) {
                        tokenTx = new TokenTransactions({
                            accountId: account._id,
                            coinId: coin._id,
                            amount: tx.value,
                            timestamp: parseInt(tx.timeStamp, 10),
                            txId: tx.hash,
                            from: tx.from,
                            to: tx.to,
                            action,
                            status: tx.txreceipt_status === '1' ? 'Success' : 'Fail'
                        });

                        await tokenTx.save();
                    }
                });

                tokenTx.forEach(async tx => {
                    let action = '';
                    let symbol = '';
                    let version = null;
                    if (tx.from === account.beneficiary) {
                        action = 'send';
                    } else if (tx.to === account.beneficiary) {
                        action = 'receive';
                    }

                    if (!symbol) {
                        const tokenIdx = tokenList.findIndex(t => t.address.toLowerCase() === tx.contractAddress.toLowerCase());
                        symbol = (tokenIdx > -1) ? tokenList[tokenIdx].symbol : symbol;
                    }

                    if (tx.contractAddress.toLowerCase() === COINVEST_TOKEN_ADDRESS_V1.toLowerCase()) {
                        symbol = 'COIN';
                        version = 'v1';
                    } else if (tx.contractAddress.toLowerCase() === COINVEST_TOKEN_ADDRESS.toLowerCase()) {
                        symbol = 'COIN';
                        version = 'v2';
                    } else if (tx.contractAddress.toLowerCase() === COINVEST_TOKEN_ADDRESS_V3.toLowerCase()) {
                        symbol = 'COIN';
                        version = 'v3';
                    }

                    const coinIdx = coins.findIndex(coin => coin.symbol === symbol);
                    if (coinIdx > -1) {
                        let tokenTx = await TokenTransactions.findOne({
                            accountId: account._id,
                            txId: tx.hash
                        });

                        if (!tokenTx) {
                            tokenTx = new TokenTransactions({
                                accountId: account._id,
                                coinId: coins[coinIdx]._id,
                                amount: tx.value,
                                timestamp: parseInt(tx.timeStamp, 10),
                                txId: tx.hash,
                                from: tx.from,
                                to: tx.to,
                                action,
                                version
                            });

                            await tokenTx.save();
                        }
                    }
                });

                account.txSynced = true;
                await account.save();
            } catch (e) {
                console.log(`[TransactionTask] Error fetching from Etherscan ${e}`);
            }
        }
    } catch (e) {
        console.log(`[TransactionTask] Error fetching etherscan`);
    }

    setTimeout(syncTransactionTask, 10000);
};

/**
 * Watch new blocks/transactions and stores relevant information into database
 *
 * @returns {Promise<void>}
 */
export const handleIncomingChainData = async () => {
    const ethCoin = await Coins.findOne({ symbol: 'ETH' }, 'symbol', { lean: true }).exec();

    startSyncingBlocks(async (block, transactions) => {
        const coins = await Coins.find({}, 'symbol address', {lean: true}).exec();
        const accounts = await Accounts.find({txSynced: true}, 'beneficiary', { lean: true }).exec();

        transactions.forEach(async tx => {
            const txReceipt = await web3.eth.getTransactionReceipt(tx.hash);

            try {
                // handle smart contract transactions
                if (txReceipt.logs.length > 0) {
                    // filter out only "Transfer" event logs
                    const transferEvents = txReceipt.logs.filter(log => log.topics.length > 0 && log.topics[0] == '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef');
                    const tradeEvents = txReceipt.logs.filter(log => log.topics.length > 0 &&
                        (log.topics[0] == '0xc3c453ebab7c6d8207cc1e5359910b016ee5fa74282e0d385824e6595ae13aab' ||
                            log.topics[0] == '0x934e9fcb0e8bcba1ad2d44addbc61ca08e7a4c6d7aa069c11f62e72ddc81b2d3'));
                    const newOraclizeQueryEvents = txReceipt.logs.filter(log => log.topics.length > 0 && log.topics[0] == '0x09133453398d2489082719969c4a67e418dbd5bdb4efbed1a73a32bc28dbc4ee');

                    // handle "newOraclizeQuery" events
                    if (newOraclizeQueryEvents.length > 0) handleNewOraclizeEvents(newOraclizeQueryEvents);

                    // handles all trade "Buy" and "Sell" events
                    if (tradeEvents.length > 0) handleTradeEvents(tradeEvents);

                    // handle transfer events
                    transferEvents.forEach(async log => {
                        const matchedToken = coins.find(coin => coin.address && coin.address.toLowerCase() === log.address.toLowerCase());
                        // check if contract address is matched
                        if (!!matchedToken) {
                            const fromAddr = `0x${log.topics[1].slice(26)}`;
                            const toAddr = `0x${log.topics[2].slice(26)}`;
                            const fromAccount = accounts.find(account => account.beneficiary.toLowerCase() === fromAddr.toLowerCase());
                            const toAccount = accounts.find(account => account.beneficiary.toLowerCase() === toAddr.toLowerCase());


                            // check if 'from' address is same as current account
                            if (!!fromAccount) {
                                const value = web3.utils.hexToNumber(log.data);

                                let tokenTx = await TokenTransactions.findOne({
                                    accountId: fromAccount._id,
                                    coinId: matchedToken._id,
                                    txId: tx.hash
                                });

                                if (!tokenTx) {
                                    tokenTx = new TokenTransactions({
                                        accountId: fromAccount._id,
                                        coinId: matchedToken._id,
                                        amount: value,
                                        timestamp: parseInt(block.timestamp, 10),
                                        txId: tx.hash,
                                        from: fromAddr,
                                        to: toAddr,
                                        action: 'send',
                                        version: matchedToken.version,
                                        status: txReceipt.status === true ? 'Success' : 'Fail'
                                    });

                                    tokenTx.save();
                                }
                            }

                            // check if 'to' address is same as current account
                            if (!!toAccount) {
                                const value = web3.utils.hexToNumber(log.data);

                                let tokenTx = await TokenTransactions.findOne({
                                    accountId: toAccount._id,
                                    coinId: matchedToken._id,
                                    txId: tx.hash
                                });

                                if (!tokenTx) {
                                    tokenTx = new TokenTransactions({
                                        accountId: toAccount._id,
                                        coinId: matchedToken._id,
                                        amount: value,
                                        timestamp: parseInt(block.timestamp, 10),
                                        txId: tx.hash,
                                        from: fromAddr,
                                        to: toAddr,
                                        action: 'send',
                                        version: matchedToken.version,
                                        status: txReceipt.status === true ? 'Success' : 'Fail'
                                    });

                                    tokenTx.save();
                                }
                            }
                        }
                    });
                } else if (tx.input === '0x' && tx.value !== '0') {
                    // handle Ether transactions
                    const toAccount = accounts.find(account => account.beneficiary.toLowerCase() === tx.to.toLowerCase());
                    const fromAccount = accounts.find(account => account.beneficiary.toLowerCase() === tx.from.toLowerCase());

                    // receiving transaction
                    if (!!toAccount) {
                        let transaction = await TokenTransactions.findOne({
                            accountId: toAccount._id,
                            coinId: ethCoin._id,
                            amount: tx.value,
                            txId: tx.hash
                        });

                        if (!transaction) {
                            transaction = new TokenTransactions({
                                accountId: toAccount._id,
                                coinId: ethCoin._id,
                                amount: tx.value,
                                timestamp: parseInt(block.timestamp, 10),
                                txId: tx.hash,
                                from: tx.from,
                                to: tx.to,
                                action: 'receive',
                                version: null,
                                status: txReceipt.status === true ? 'Success' : 'Fail'
                            });

                            transaction.save();
                        }
                    }

                    // sending transaction : we need to save same transaction for both account in case 'from' and 'to' both matched
                    if (!!fromAccount) {
                        let transaction = await TokenTransactions.findOne({
                            accountId: fromAccount._id,
                            coinId: ethCoin._id,
                            amount: tx.value,
                            txId: tx.hash
                        });

                        if (!transaction) {
                            transaction = new TokenTransactions({
                                accountId: fromAccount._id,
                                coinId: ethCoin._id,
                                amount: tx.value,
                                timestamp: parseInt(block.timestamp, 10),
                                txId: tx.hash,
                                from: tx.from,
                                to: tx.to,
                                action: 'send',
                                version: null,
                                status: txReceipt.status === true ? 'Success' : 'Fail'
                            });

                            transaction.save();
                        }
                    }
                }
            } catch (e) {
                console.log(`[TransactionsSubscriber] Error processing new transactions\n ${e}`);
            }
        });
    });
};
