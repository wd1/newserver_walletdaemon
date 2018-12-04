const request = require('request');

const Accounts = require('../models/Accounts');
const Wallets = require('../models/Wallets');
const Coins = require('../models/Coins');
const TokenTransactions = require('../models/TokenTransactions');

const {
    COINVEST_TOKEN_ADDRESS_V1,
    COINVEST_TOKEN_ADDRESS_V2,
    COINVEST_TOKEN_ADDRESS_V3,
    tokenList
} = require('../services/Config');
const Web3Service = require('../services/Web3Service');
const TruffleService = require('../services/TruffleService');

const {
    ETHSCAN_URI,
    ETHSCAN_API_KEY1,
    ETHSCAN_API_KEY2
} = process.env;


/**
 * Promise function to get Eth balance
 */
const asyncEthMultiple = (wallet, beneficiary, idx) => new Promise(resolve => {
    setTimeout(() => {
        Web3Service.getBalance(beneficiary)
            .then(balance => {
                wallet.quantity = balance;
                wallet.latest = new Date().toUTCString();
                wallet.save(err => {
                    if (err) {
                        console.log('asyncEthMultiple - save: ', err);
                    }
                });
                resolve();
            })
            .catch(err => {
                console.log('asyncEthMultiple: ', err);
                resolve();
            });
    }, 100 * idx);
});

const getEthWallet = async () => {
    try {
        const coins = await Coins.find({}, 'symbol', { lean: true }).exec();
        if (coins && coins.length > 0) {
            const coinEthIdx = coins.findIndex(coin => coin.symbol === 'ETH');
            if (coinEthIdx > -1) {
                const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
                if (accounts && accounts.length > 0) {
                    const wallets = await Wallets.find({ coinId: coins[coinEthIdx]._id }).exec();
                    if (wallets && wallets.length > 0) {
                        const actions = wallets.map((wallet, idx) => {
                            const accountIdx = accounts.findIndex(a => a._id == wallet.accountId);
                            if (accountIdx > -1) {
                                return asyncEthMultiple(wallet, accounts[accountIdx].beneficiary, idx);
                            }

                            return new Promise(resolve => {
                                resolve();
                            });
                        });

                        await Promise.all(actions);
                    }
                }
            }
        }
    } catch (e) {
        console.log('getEthWallet: ', e);
    }

    setTimeout(getEthWallet, 5000);
};


/**
 * Promise function to get Token balance
 */
const asyncTokenMultiple = (wallet, beneficiary, contractAddress, idx) => new Promise(resolve => {
    setTimeout(() => {
        TruffleService.coinBalanceOther(beneficiary, contractAddress)
            .then(balance => {
                wallet.quantity = balance;
                wallet.latest = new Date().toUTCString();
                wallet.save(err => {
                    if (err) {
                        console.log('asyncTokenMultiple - save: ', err);
                    }
                });
                resolve();
            })
            .catch(err => {
                console.log('asyncTokenMultiple: ', err);
                resolve();
            });
    }, 50 * idx);
});

const getTokenWallet = async () => {
    try {
        const coins = await Coins.find({}, 'symbol', { lean: true }).exec();
        if (coins && coins.length > 0) {
            const coinEthIdx = coins.findIndex(coin => coin.symbol === 'ETH');
            if (coinEthIdx > -1) {
                const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
                if (accounts && accounts.length > 0) {
                    const wallets = await Wallets.find({ coinId: { $ne: coins[coinEthIdx]._id } }).exec();
                    if (wallets && wallets.length > 0) {
                        const actions = wallets.map((wallet, idx) => {
                            const accountIdx = accounts.findIndex(a => a._id == wallet.accountId);
                            if (accountIdx > -1) {
                                const coinIdx = coins.findIndex(c => c._id == wallet.coinId);
                                if (coinIdx > -1) {
                                    let contractAddress = coins[coinIdx].address;
                                    if (coins[coinIdx].symbol === 'COIN') {
                                        if (coins[coinIdx].version === 'v1') {
                                            contractAddress = COINVEST_TOKEN_ADDRESS_V1;
                                        } else if (coins[coinIdx].version === 'v2') {
                                            contractAddress = COINVEST_TOKEN_ADDRESS_V2;
                                        } else if (coins[coinIdx].version === 'v3') {
                                            contractAddress = COINVEST_TOKEN_ADDRESS_V3;
                                        }
                                    }

                                    if (contractAddress) {
                                        return asyncTokenMultiple(wallet, accounts[accountIdx].beneficiary, contractAddress, idx);
                                    }
                                }
                            }

                            return new Promise(resolve => {
                                resolve();
                            });
                        });

                        await Promise.all(actions);
                    }
                }
            }
        }
    } catch (e) {
        console.log('getTokenWallet: ', e);
    }

    setTimeout(getTokenWallet, 5000);
};


/**
 * Get token transactions
 */
const asyncTokenTransactionMultiple = (account, idx) => {
    const url = `${ETHSCAN_URI}&action=tokentx&startblock=0&endblock=latest&sort=desc&apikey=${ETHSCAN_API_KEY1}&address=`;

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
                        resolve({ txData: data.result, account });
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

const getTokenTransactions = async () => {
    try {
        const coins = await Coins.find({}, 'symbol', { lean: true }).exec();
        if (coins && coins.length > 0) {
            const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
            if (accounts && accounts.length > 0) {
                const actions = accounts.map(asyncTokenTransactionMultiple);

                let data = await Promise.all(actions);
                data = data.filter(item => !!item);
                data.forEach(dt => {
                    dt.txData.forEach(tx => {
                        let action = '';
                        if (tx.from === dt.account.beneficiary) {
                            action = 'send';
                        } else if (tx.to === dt.account.beneficiary) {
                            action = 'receive';
                        }

                        let symbol = tx.tokenSymbol;
                        if (!symbol) {
                            const tokenIdx = tokenList.findIndex(t => t.address.toLowerCase() === tx.contractAddress.toLowerCase());
                            symbol = (tokenIdx > -1) ? tokenList[tokenIdx].symbol : symbol;
                        }

                        let version = null;
                        if (tx.contractAddress.toLowerCase() === COINVEST_TOKEN_ADDRESS_V1.toLowerCase()) {
                            symbol = 'COIN';
                            version = 'v1';
                        } else if (tx.contractAddress.toLowerCase() === COINVEST_TOKEN_ADDRESS_V2.toLowerCase()) {
                            symbol = 'COIN';
                            version = 'v2';
                        } else if (tx.contractAddress.toLowerCase() === COINVEST_TOKEN_ADDRESS_V3.toLowerCase()) {
                            symbol = 'COIN';
                            version = 'v3';
                        }

                        if (symbol) {
                            const coinIndex = coins.findIndex(coin => coin.symbol === symbol);
                            if (coinIndex > -1) {
                                TokenTransactions.findOne({
                                    accountId: dt.account._id,
                                    coinId: coins[coinIndex]._id,
                                    amount: tx.value,
                                    txId: tx.hash,
                                    version
                                }, (err, tokenTransaction) => {
                                    if (err) {
                                        console.log('getTokenTransactions: ', err);
                                        return;
                                    }

                                    if (!tokenTransaction) {
                                        tokenTransaction = new TokenTransactions({
                                            accountId: dt.account._id,
                                            coinId: coins[coinIndex]._id,
                                            amount: tx.value,
                                            timestamp: parseInt(tx.timeStamp, 10),
                                            txId: tx.hash,
                                            from: tx.from,
                                            to: tx.to,
                                            action,
                                            version
                                        });

                                        tokenTransaction.save(err => {
                                            if (err) {
                                                console.log('getTokenTransactions - save: ', err);
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });
                });
            }
        }
    } catch (e) {
        console.log('getTokenTransactions: ', e);
    }

    setTimeout(getTokenTransactions, 30000);
};


/**
 * Get Ether transactions
 */
const asyncEthTransactionMultiple = (account, idx) => {
    const url = `${ETHSCAN_URI}&action=txlist&startblock=0&endblock=latest&sort=desc&apikey=${ETHSCAN_API_KEY2}&address=`;

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
                        resolve({ txData: data.result, account });
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

const getEtherTransactions = async () => {
    try {
        const coin = await Coins.findOne({ symbol: 'ETH' }, 'symbol', { lean: true }).exec();
        if (coin) {
            const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
            if (accounts && accounts.length > 0) {
                const actions = accounts.map(asyncEthTransactionMultiple);

                let data = await Promise.all(actions);
                data = data.filter(item => !!item);
                data.forEach(dt => {
                    dt.txData.forEach(tx => {
                        if (tx.txreceipt_status !== '' && tx.value !== '0') {
                            let action = '';
                            if (tx.from === dt.account.beneficiary) {
                                action = 'send';
                            } else if (tx.to === dt.account.beneficiary) {
                                action = 'receive';
                            }

                            try {
                                TokenTransactions.findOne({
                                    accountId: dt.account._id,
                                    coinId: coin._id,
                                    amount: tx.value,
                                    txId: tx.hash
                                }, (err, tokenTransaction) => {
                                    if (err) {
                                        console.log('getEtherTransactions: ', err);
                                        return;
                                    }

                                    if (!tokenTransaction) {
                                        tokenTransaction = new TokenTransactions({
                                            accountId: dt.account._id,
                                            coinId: coin._id,
                                            amount: tx.value,
                                            timestamp: parseInt(tx.timeStamp, 10),
                                            txId: tx.hash,
                                            from: tx.from,
                                            to: tx.to,
                                            action,
                                            status: tx.txreceipt_status === '1' ? 'Success' : 'Fail'
                                        });

                                        tokenTransaction.save(err => {
                                            if (err) {
                                                console.log('getEtherTransactions - save: ', err);
                                            }
                                        });
                                    }
                                });
                            } catch (err) {
                                console.log('getEtherTransactions: ', err);
                            }
                        }
                    });
                });
            }
        }
    } catch (e) {
        console.log('getEtherTransactions: ', e);
    }

    setTimeout(getEtherTransactions, 30000);
};


exports.walletSchedule = () => {
    getEthWallet();

    setTimeout(getTokenWallet, 1000);

    setTimeout(getTokenTransactions, 4000);

    setTimeout(getEtherTransactions, 5000);
};
