const request = require('request');
const schedule = require('node-schedule');

const Accounts = require('../models/Accounts');
const Wallets = require('../models/Wallets');
const Coins = require('../models/Coins');
const CoinWallets = require('../models/CoinWallets');
const TokenTransactions = require('../models/TokenTransactions');

const { COINVEST_TOKEN_ADDRESS_V1, COINVEST_TOKEN_ADDRESS_V3 } = require('../services/Config');
const Web3Service = require('../services/Web3Service');
const TruffleService = require('../services/TruffleService');

const { ETHSCAN_URI, ETHSCAN_API_KEY } = process.env;

let updateWallet;
let updateWalletWeb3;
let updateTokenTransaction;
let updateEtherTransaction;

const getWalletWeb3 = async () => {
    try {
        const coins = await Coins.find({ symbol: ['ETH', 'COIN'] }, 'symbol', { lean: true }).exec();
        if (coins && coins.length > 0) {
            let coin;
            let coinEth;

            const coinIdx = coins.findIndex(coin => coin.symbol === 'COIN');
            if (coinIdx > -1) {
                coin = coins[coinIdx];
            }

            const coinEthIdx = coins.findIndex(coin => coin.symbol === 'ETH');
            if (coinEthIdx > -1) {
                coinEth = coins[coinEthIdx];
            }

            const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
            if (accounts && accounts.length > 0) {
                accounts.forEach(account => {
                    if (coinEth) {
                        Web3Service.getBalance(account.beneficiary)
                            .then(balance => {
                                Wallets.findOne({ accountId: account._id, coinId: coinEth._id }, (err, wallet) => {
                                    if (err) {
                                        console.log('getWalletWeb3: Wallets.findOne: ', err);
                                        return;
                                    }

                                    if (wallet) {
                                        wallet.set({ quantity: balance });
                                    } else {
                                        wallet = new Wallets({
                                            accountId: account._id,
                                            coinId: coinEth._id,
                                            quantity: balance
                                        });
                                    }

                                    wallet.save(err => {
                                        if (err) {
                                            console.log('getWalletWeb3: wallet.save: ', err);
                                        }
                                    });
                                });
                            })
                            .catch(err => {
                                console.log('getWalletWeb3: getBalance: ', err);
                            });
                    }

                    if (coin) {
                        TruffleService.coinBalance(account.beneficiary)
                            .then(balance => {
                                Wallets.findOne({ accountId: account._id, coinId: coin._id }, (err, wallet) => {
                                    if (err) {
                                        console.log('getWalletWeb3: Wallets.findOne: ', err);
                                        return;
                                    }

                                    if (wallet) {
                                        wallet.set({ quantity: balance });
                                    } else {
                                        wallet = new Wallets({
                                            accountId: account._id,
                                            coinId: coin._id,
                                            quantity: balance
                                        });
                                    }

                                    wallet.save(err => {
                                        if (err) {
                                            console.log('getWalletWeb3: wallet.save: ', err);
                                        }
                                    });
                                });
                            })
                            .catch(err => {
                                console.log('getWalletWeb3: coinBalance: ', err);
                            });

                        TruffleService.coinBalanceOther(account.beneficiary, COINVEST_TOKEN_ADDRESS_V1)
                            .then(async balance => {
                                CoinWallets.findOne({ accountId: account._id, version: 'v1' }, (err, wallet) => {
                                    if (err) {
                                        console.log('getWalletWeb3: CoinWallets.v1: ', err);
                                        return;
                                    }

                                    if (wallet) {
                                        wallet.set({ quantity: balance });
                                    } else {
                                        wallet = new CoinWallets({
                                            accountId: account._id,
                                            version: 'v1',
                                            quantity: balance
                                        });
                                    }

                                    wallet.save(err => {
                                        if (err) {
                                            console.log('getWalletWeb3 - v1.save: ', err);
                                        }
                                    });
                                });
                            })
                            .catch(err => {
                                console.log('getWalletWeb3 - v1: ', err);
                            });

                        TruffleService.coinBalanceOther(account.beneficiary, COINVEST_TOKEN_ADDRESS_V3)
                            .then(async balance => {
                                CoinWallets.findOne({ accountId: account._id, version: 'v3' }, (err, wallet) => {
                                    if (err) {
                                        console.log('getWalletWeb3: CoinWallets.v3: ', err);
                                        return;
                                    }

                                    if (wallet) {
                                        wallet.set({ quantity: balance });
                                    } else {
                                        wallet = new CoinWallets({
                                            accountId: account._id,
                                            version: 'v3',
                                            quantity: balance
                                        });
                                    }

                                    wallet.save(err => {
                                        if (err) {
                                            console.log('getWalletWeb3 - v3.save: ', err);
                                        }
                                    });
                                });
                            })
                            .catch(err => {
                                console.log('getWalletWeb3 - v3: ', err);
                            });
                    }
                });
            }
        }
    } catch (e) {
        console.log('getWalletWeb3: ', e);
    }
};

const getTransactionRequest = (account, page, coins) => {
    const url = `${ETHSCAN_URI}&action=tokentx&startblock=0&endblock=latest&offset=10000&sort=desc&apikey=${ETHSCAN_API_KEY}&address=`;
    request(`${url + account.beneficiary}&page=${page}`, async (err, response) => {
        if (err) {
            console.log('getTokenTransactions: etherscan: ', err);
            getTransactionRequest(account, page, coins);
            return;
        }

        try {
            if (response.statusCode === 200) {
                const data = JSON.parse(response.body);
                let allSaved = true;

                if (data.result && data.result.length > 0) {
                    for (let i = 0; i < data.result.length; i++) {
                        const tx = data.result[i];

                        let action = '';
                        if (tx.from === account.beneficiary) {
                            action = 'send';
                        } else if (tx.to === account.beneficiary) {
                            action = 'receive';
                        }

                        const coinIndex = coins.findIndex(coin => coin.symbol === tx.tokenSymbol);
                        if (coinIndex > -1) {
                            let tokenTransaction = await TokenTransactions.findOne({
                                accountId: account._id, coinId: coins[coinIndex]._id, amount: tx.value, txId: tx.hash
                            }).exec();
                            if (!tokenTransaction) {
                                tokenTransaction = new TokenTransactions({
                                    accountId: account._id,
                                    coinId: coins[coinIndex]._id,
                                    amount: tx.value,
                                    timestamp: parseInt(tx.timeStamp, 10),
                                    txId: tx.hash,
                                    from: tx.from,
                                    to: tx.to,
                                    action
                                });

                                tokenTransaction.save(err => {
                                    if (err) {
                                        console.log('getTokenTransactions: save: ', err);
                                    }
                                });

                                allSaved = false;
                            }
                        }
                    }

                    getTransactionRequest(account, page + 1, coins);
                }
            } else {
                getTransactionRequest(account, page, coins);
            }
        } catch (err) {
            console.log('getTransactionRequest: catch: ', err);
        }
    });
};

const getTokenTransactions = async () => {
    try {
        const coins = await Coins.find({}, 'symbol', { lean: true }).exec();
        if (coins && coins.length > 0) {
            const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
            accounts.forEach((account, idx) => {
                setTimeout(() => {
                    getTransactionRequest(account, 1, coins);
                }, 200 * idx);
            });
        }
    } catch (e) {
        console.log('getTokenTransactions: ', e);
    }
};

const getEtherTransactionsRequest = (account, page, coin) => {
    const url = `${ETHSCAN_URI}&action=txlist&startblock=0&endblock=latest&offset=10000&sort=desc&apikey=${ETHSCAN_API_KEY}&address=`;
    request(`${url + account.beneficiary}&page=${page}`, async (err, response) => {
        if (err) {
            console.log('getEtherTransactions: etherscan: ', err);
            getEtherTransactionsRequest(account, page, coin);
            return;
        }

        try {
            if (response.statusCode === 200) {
                const data = JSON.parse(response.body);
                let allSaved = true;

                if (data.result && data.result.length > 0) {
                    for (let i = 0; i < data.result.length; i++) {
                        const tx = data.result[i];

                        if (tx.txreceipt_status !== '' && tx.value !== '0') {
                            let action = '';
                            if (tx.from === account.beneficiary) {
                                action = 'send';
                            } else if (tx.to === account.beneficiary) {
                                action = 'receive';
                            }

                            try {
                                let tokenTransaction = await TokenTransactions.findOne({
                                    accountId: account._id, coinId: coin._id, amount: tx.value, txId: tx.hash
                                }).exec();
                                if (!tokenTransaction) {
                                    tokenTransaction = new TokenTransactions({
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

                                    tokenTransaction.save(err => {
                                        if (err) {
                                            console.log('getEtherTransactions: save: ', err);
                                        }
                                    });

                                    allSaved = false;
                                }
                            } catch (err) {
                                console.log('getEtherTransactions: find: ', err);
                            }
                        }
                    }

                    getEtherTransactionsRequest(account, page + 1, coin);
                }
            } else {
                getEtherTransactionsRequest(account, page, coin);
            }
        } catch (err) {
            console.log('getEtherTransactionsRequest: catch: ', err);
        }
    });
};

const getEtherTransactions = async () => {
    try {
        const coin = await Coins.findOne({ symbol: 'ETH' }, 'symbol', { lean: true }).exec();
        if (coin) {
            const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
            accounts.forEach((account, idx) => {
                setTimeout(() => {
                    getEtherTransactionsRequest(account, 1, coin);
                }, 200 * idx);
            });
        }
    } catch (e) {
        console.log('getEtherTransactions: ', e);
    }
};

exports.walletSchedule = () => {
    updateWalletWeb3 = schedule.scheduleJob('*/15 * * * * *', getWalletWeb3);
    updateTokenTransaction = schedule.scheduleJob('*/1 * * * *', getTokenTransactions);
    updateEtherTransaction = schedule.scheduleJob('*/1 * * * *', getEtherTransactions);
};

exports.cancelWalletSchedule = () => {
    if (updateWallet) {
        updateWallet.cancel();
    }
};

exports.cancelWalletWeb3Schedule = () => {
    if (updateWalletWeb3) {
        updateWalletWeb3.cancel();
    }
};

exports.cancelTokenTransactionSchedule = () => {
    if (updateTokenTransaction) {
        updateTokenTransaction.cancel();
    }
};

exports.cancelEtherTransactionSchedule = () => {
    if (updateEtherTransaction) {
        updateEtherTransaction.cancel();
    }
};
