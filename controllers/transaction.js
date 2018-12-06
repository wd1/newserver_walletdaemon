import _ from 'lodash';
import rp from 'request-promise';
import dotenv from 'dotenv';
import Accounts from '../models/Accounts';
import Wallets from '../models/Wallets';
import Coins from '../models/Coins';
import TokenTransactions from '../models/TokenTransactions';
import { web3, startSyncingBlocks } from '../services/web3Socket';
import {
    CMC_API_SECRET, COINVEST_TOKEN_ADDRESS,
    COINVEST_TOKEN_ADDRESS_V1,
    COINVEST_TOKEN_ADDRESS_V3, tokenList
} from '../services/Config';

dotenv.config();

const {
    ETHSCAN_URI,
    ETHSCAN_API_KEY5,
    ETHSCAN_API_KEY6
} = process.env;

const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Daemons that synchronize user transaction history from etherscan
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
            console.log(account);
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
        const coins = await Coins.find({}, 'symbol', { lean: true }).exec();
        const accounts = await Accounts.find({txSynced: true}, 'beneficiary', { lean: true }).exec();

        transactions.forEach(async tx => {
            let action = '';
            let account = null;
            let symbol = null;
            let version = null;

            if (_.find(accounts, {beneficiary: tx.to})) {
                account = _.find(accounts, {beneficiary: tx.to});
                action = 'receive';
            } else if (_.find(accounts, {beneficiary: tx.from})) {
                account = _.find(accounts, {beneficiary: tx.from});
                action = 'send';

                // check if it is token transfer()
                if (tx.value === '0') {
                    const tokenIdx = tokenList.findIndex(t => t.address.toLowerCase() === tx.to.toLowerCase());
                    symbol = (tokenIdx > -1) ? tokenList[tokenIdx].symbol : symbol;
                    version = (tokenIdx > -1 && tokenList[tokenIdx].version) ? tokenList[tokenIdx].version : null;
                }
            }

            if (!!action) {
                const coinIndex = symbol ? coins.findIndex(coin => coin.symbol === symbol) : ethCoin._id;
                let tokenTx = await TokenTransactions.findOne({
                    accountId: account._id,
                    coinId: coinIndex,
                    amount: tx.value,
                    txId: tx.hash
                });

                if (!tokenTx) {
                    const txReceipt = await web3.eth.getTransactionReceipt(tx.hash);

                    if (tx.value !== '0') { // eth transaction
                        tokenTx = new TokenTransactions({
                            accountId: account._id,
                            coinId: coinIndex,
                            amount: tx.value,
                            timestamp: parseInt(block.timestamp, 10),
                            txId: tx.hash,
                            from: tx.from,
                            to: tx.to,
                            action,
                            version,
                            status: txReceipt.status === true ? 'Success' : 'Fail'
                        });

                        tokenTx.save();
                    } else if (tx.value === '0' && symbol) {
                        // check if it is transfer function; topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
                        const transferEvents = _.filter(txReceipt.logs, log => log.topics.length > 0 && log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef');

                        transferEvents.forEach(log => {
                            // check if 'from' address is same as current account
                            if (log.topics[1].slice(26) === account.beneficiary.slice(2)) {
                                const value = web3.utils.hexToNumber(log.data);
                                const toAddr = `0x${log.topics[2].slice(26)}`;
                                tokenTx = new TokenTransactions({
                                    accountId: account._id,
                                    coinId: coinIndex,
                                    amount: value,
                                    timestamp: parseInt(block.timestamp, 10),
                                    txId: tx.hash,
                                    from: tx.from,
                                    to: toAddr,
                                    action,
                                    version,
                                    status: txReceipt.status === true ? 'Success' : 'Fail'
                                });

                                tokenTx.save();
                            }
                        });
                    }
                }
            }
        });
    });
};
