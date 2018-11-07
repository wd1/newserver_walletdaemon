const request = require('request');
const axios = require('axios');
const BigNumber = require('bignumber.js');
const schedule = require('node-schedule');

const Accounts = require('../models/Accounts');
const Wallets = require('../models/Wallets');
const Coins = require('../models/Coins');
const CoinWallets = require('../models/CoinWallets');
const TokenTransactions = require('../models/TokenTransactions');

const { bignumberToString } = require('../services/bignumber2string');

const {
    COINVEST_TOKEN_ADDRESS,
    COINVEST_TOKEN_ADDRESS_V1,
    COINVEST_TOKEN_ADDRESS_V3,
    tokenList
} = require('../services/Config');
const Web3Service = require('../services/Web3Service');
const TruffleService = require('../services/TruffleService');

const { ETHSCAN_URI, ETHSCAN_API_KEY, GETH_INFURA } = process.env;

let updateWallet;
let updateWalletWeb3;
let updateTokenTransaction;
let updateEtherTransaction;

const getWalletWeb3 = async () => {
    try {
        const coins = await Coins.find({}, 'symbol', { lean: true }).exec();
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

const getWalletWeb3Infura = async () => {
    try {
        const coins = await Coins.find({}, 'symbol', { lean: true }).exec();
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
                accounts.forEach((account, idx) => {
                    setTimeout(() => {
                        Wallets.find({ accountId: account._id }, (err, wallets) => {
                            if (err) {
                                console.log('getWalletWeb3Infura - Wallets.find: ', err);
                                return;
                            }

                            if (wallets && wallets.length > 0) {
                                wallets.forEach(wallet => {
                                    const coIdx = coins.findIndex(c => c._id == wallet.coinId);
                                    if (coIdx > -1) {
                                        if (coins[coIdx].symbol === 'COIN') {
                                            return;
                                        }

                                        if (coins[coIdx].symbol === 'ETH' && coinEth) {
                                            const url = `${ETHSCAN_URI}&action=balance&tag=latest&apikey=${ETHSCAN_API_KEY}&address=${account.beneficiary}`;
                                            request(url, (err, response) => {
                                                if (err) {
                                                    console.log('getWalletWeb3Infura - eth.get: ', err);
                                                    return;
                                                }

                                                try {
                                                    if (response.statusCode === 200) {
                                                        const data = JSON.parse(response.body);
                                                        if (data.result) {
                                                            wallet.quantity = data.result;
                                                            wallet.save(err => {
                                                                if (err) {
                                                                    console.log('getWalletWeb3Infura - eth.save: ', err);
                                                                }
                                                            });
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.log('getWalletWeb3Infura - eth: ', err);
                                                }
                                            });
                                        } else {
                                            const tokenIdx = tokenList.findIndex(t => t.symbol === coins[coIdx].symbol);
                                            if (tokenIdx > -1) {
                                                const contractAddress = tokenList[tokenIdx].address;

                                                const url = `${ETHSCAN_URI}&action=tokenbalance&tag=latest&apikey=${ETHSCAN_API_KEY}&address=${account.beneficiary}&contractaddress=${contractAddress}`;
                                                request(url, (err, response) => {
                                                    if (err) {
                                                        console.log('getWalletWeb3Infura - custom.get: ', err);
                                                        return;
                                                    }

                                                    try {
                                                        if (response.statusCode === 200) {
                                                            const data = JSON.parse(response.body);
                                                            if (data.result) {
                                                                wallet.quantity = data.result;
                                                                wallet.save(err => {
                                                                    if (err) {
                                                                        console.log('getWalletWeb3Infura - custom.save: ', err);
                                                                    }
                                                                });
                                                            }
                                                        }
                                                    } catch (e) {
                                                        console.log('getWalletWeb3Infura - custom: ', err);
                                                    }
                                                });
                                            }
                                        }
                                    }
                                });
                            }
                        });

                        if (coin) {
                            const url = `${ETHSCAN_URI}&action=tokenbalance&tag=latest&apikey=${ETHSCAN_API_KEY}&address=${account.beneficiary}&contractaddress=`;

                            request(`${url + COINVEST_TOKEN_ADDRESS}`, async (err, response) => {
                                if (err) {
                                    console.log('getWalletWeb3Infura - v2: ', err);
                                    return;
                                }

                                try {
                                    if (response.statusCode === 200) {
                                        const data = JSON.parse(response.body);
                                        if (data.result) {
                                            const v2Wallet = await Wallets.findOne({ accountId: account._id, coinId: coin._id }).exec();
                                            if (v2Wallet) {
                                                v2Wallet.quantity = data.result;
                                                v2Wallet.save(err => {
                                                    if (err) {
                                                        console.log('getWalletWeb3Infura - v2.save: ', err);
                                                    }
                                                });
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.log('getWalletWeb3Infura - v2: ', err);
                                }
                            });

                            request(`${url + COINVEST_TOKEN_ADDRESS_V1}`, async (err, response) => {
                                if (err) {
                                    console.log('getWalletWeb3Infura - v1: ', err);
                                    return;
                                }

                                try {
                                    if (response.statusCode === 200) {
                                        const data = JSON.parse(response.body);
                                        if (data.result) {
                                            const v1Wallet = await CoinWallets.findOne({ accountId: account._id, version: 'v1' }).exec();
                                            if (v1Wallet) {
                                                v1Wallet.quantity = data.result;
                                                v1Wallet.save(err => {
                                                    if (err) {
                                                        console.log('getWalletWeb3Infura - v1.save: ', err);
                                                    }
                                                });
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.log('getWalletWeb3Infura - v1: ', err);
                                }
                            });

                            request(`${url + COINVEST_TOKEN_ADDRESS_V3}`, async (err, response) => {
                                if (err) {
                                    console.log('getWalletWeb3Infura - v3: ', err);
                                    return;
                                }

                                try {
                                    if (response.statusCode === 200) {
                                        const data = JSON.parse(response.body);
                                        if (data.result) {
                                            const v3Wallet = await CoinWallets.findOne({ accountId: account._id, version: 'v3' }).exec();
                                            if (v3Wallet) {
                                                v3Wallet.quantity = data.result;
                                                v3Wallet.save(err => {
                                                    if (err) {
                                                        console.log('getWalletWeb3Infura - v3.save: ', err);
                                                    }
                                                });
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.log('getWalletWeb3Infura - v3: ', err);
                                }
                            });
                        }
                    }, 200 * idx);
                });
            }
        }
    } catch (e) {
        console.log('getWalletWeb3Infura: ', e);
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

                        if (symbol) {
                            const coinIndex = coins.findIndex(coin => coin.symbol === symbol);
                            if (coinIndex > -1) {
                                let tokenTransaction = await TokenTransactions.findOne({
                                    accountId: account._id,
                                    coinId: coins[coinIndex]._id,
                                    amount: tx.value,
                                    txId: tx.hash,
                                    version
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
                                        action,
                                        version
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
    updateWalletWeb3 = schedule.scheduleJob('*/30 * * * * *', getWalletWeb3Infura);
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
