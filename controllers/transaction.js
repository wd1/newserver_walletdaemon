import _ from 'lodash';
import request from 'request';
import dotenv from 'dotenv';
import Accounts from '../models/Accounts';
import Wallets from '../models/Wallets';
import Coins from '../models/Coins';
import TokenTransactions from '../models/TokenTransactions';
import { web3, startSyncingBlocks } from '../services/web3Socket';
// import { COINVEST_TOKEN_ADDRESS,
//     COINVEST_TOKEN_ADDRESS_V1,
//     COINVEST_TOKEN_ADDRESS_V3, tokenList } from '../services/Config';

dotenv.config();

const {
    ETHSCAN_URI,
    ETHSCAN_API_KEY1,
    ETHSCAN_API_KEY2,
    ETHSCAN_API_KEY3,
    ETHSCAN_API_KEY4,
    ETHSCAN_API_KEY5,
    ETHSCAN_API_KEY6
} = process.env;

const tokenList = [
    {
        address: '0xc778417e063141139fce010982780140aa0cd5ab',
        symbol: 'WETH',
        decimal: 18,
        type: 'default'
    },
    {
        address: '0xff67881f8d12f372d91baae9752eb3631ff0ed00',
        symbol: 'ZRX',
        decimal: 18,
        type: 'default'
    },
    {
        address: '0x4af4114f73d1c1c903ac9e0361b379d1291808a2',
        symbol: 'VTY',
        decimal: 8,
        type: 'default'
    }
];


const fetchEthTx = (account, idx) => {
    const url = `${ETHSCAN_URI}&action=txlist&startblock=0&endblock=latest&sort=desc&apikey=${ETHSCAN_API_KEY6}&address=`;

    return new Promise(resolve => {
        // Add some delay for each request because of etherscan rate limit
        setTimeout(() => {
            request(`${url + account.beneficiary}`, async (err, response) => {
                if (err) {
                    console.log('asyncEthTransactionMultiple: ', err);
                    resolve(null);
                    return;
                }

                try {
                    if (response.statusCode === 200) {
                        const data = JSON.parse(response.body);
                        resolve({ txData: data.result, account, type: 'eth' });
                    } else {
                        resolve(null);
                    }
                } catch (err) {
                    console.log('asyncEthTransactionMultiple: catch: ', err);
                    resolve(null);
                }
            });
        }, 100 * idx);
    });
};

/**
 * Get token transactions
 */
const fetchTokenTx = (account, idx) => {
    const url = `${ETHSCAN_URI}&action=tokentx&startblock=0&endblock=latest&sort=desc&apikey=${ETHSCAN_API_KEY5}&address=`;

    return new Promise(resolve => {
        // Add some delay for each request because of etherscan rate limit
        setTimeout(() => {
            request(`${url + account.beneficiary}`, async (err, response) => {
                if (err) {
                    console.log('asyncTokenTransactionMultiple: ', err);
                    resolve(null);
                    return;
                }

                try {
                    if (response.statusCode === 200) {
                        const data = JSON.parse(response.body);
                        resolve({ txData: data.result, account, type: 'token' });
                    } else {
                        resolve(null);
                    }
                } catch (err) {
                    console.log('getTransactionRequest: catch: ', err);
                    resolve(null);
                }
            });
        }, 100 * idx);
    });
};

/**
 * Daemons that synchronize user transaction history from etherscan
 *
 * @returns {Promise<void>}
 */
export const syncTransactionTask = async () => {
    console.log(`------------- Synchronizing Transactions from Etherscan ----------`);

    try {
        const coin = await Coins.findOne({ symbol: 'ETH' }, 'symbol', { lean: true }).exec();
        const coins = await Coins.find({}, 'symbol', { lean: true }).exec();
        const accounts = await Accounts.find({txSynced: false}).exec();
        let ethTxData = await Promise.all(accounts.map(fetchEthTx));
        let tokenTxData = await Promise.all(accounts.map(fetchTokenTx));

        ethTxData = ethTxData.filter(item => !!item);
        tokenTxData = tokenTxData.filter(item => !!item);

        await Promise.all(ethTxData.concat(tokenTxData).map(async item => {
            await Promise.all(item.txData.map(async tx => {
                let action = '';
                const symbol = '';
                const version = null;
                if (tx.from === item.account.beneficiary) {
                    action = 'send';
                } else if (tx.to === item.account.beneficiary) {
                    action = 'receive';
                }

                if (item.type === 'token') {
                    let symbol = tx.tokenSymbol;
                    if (!symbol) {
                        const tokenIdx = tokenList.findIndex(t => t.address.toLowerCase() === tx.contractAddress.toLowerCase());
                        symbol = (tokenIdx > -1) ? tokenList[tokenIdx].symbol : symbol;
                    }

                    let version = null;
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
                }

                const coinIdx = item.type === 'token' ? coins.findIndex(coin => coin.symbol === symbol) : coin._id;
                if (coinIdx) {
                    let tokenTx = await TokenTransactions.findOne({
                        accountId: item.account._id,
                        txId: tx.hash
                    });

                    if (!tokenTx) {
                        if (item.type === 'token') {
                            tokenTx = new TokenTransactions({
                                accountId: item.account._id,
                                coinId: coins[coinIdx]._id,
                                amount: tx.value,
                                timestamp: parseInt(tx.timeStamp, 10),
                                txId: tx.hash,
                                from: tx.from,
                                to: tx.to,
                                action,
                                version
                            });
                        } else {
                            tokenTx = new TokenTransactions({
                                accountId: item.account._id,
                                coinId: coin._id,
                                amount: tx.value,
                                timestamp: parseInt(tx.timeStamp, 10),
                                txId: tx.hash,
                                from: tx.from,
                                to: tx.to,
                                action,
                                status: tx.txreceipt_status === '1' ? 'Success' : 'Fail'
                            });
                        }

                        tokenTx.save();  // don't need to await
                    }
                }
            }));

            item.account.txSynced = true;
            return item.account.save();
        }));
    } catch (e) {
        console.log(`[WalletDaemon] Error fetching etherscan`);
    }

    await setTimeout(syncTransactionTask, parseInt(process.env.TIME_OUT || 15, 10) * 1000);
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
