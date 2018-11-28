const request = require('request');
const schedule = require('node-schedule');

const Accounts = require('../models/Accounts');
const Wallets = require('../models/Wallets');
const Coins = require('../models/Coins');
const CoinWallets = require('../models/CoinWallets');
const TokenTransactions = require('../models/TokenTransactions');

const {
    COINVEST_TOKEN_ADDRESS,
    COINVEST_TOKEN_ADDRESS_V1,
    COINVEST_TOKEN_ADDRESS_V3,
    tokenList
} = require('../services/Config');
const Web3Service = require('../services/Web3Service');
const TruffleService = require('../services/TruffleService');

const {
    ETHSCAN_URI,
    ETHSCAN_API_KEY1,
    ETHSCAN_API_KEY2,
    ETHSCAN_API_KEY3,
    ETHSCAN_API_KEY4,
    ETHSCAN_API_KEY5,
    ETHSCAN_API_KEY6
} = process.env;

/**
 * Get wallets balances using Truffle & Web3
 */
// const getWalletWeb3 = async () => {
//     try {
//         const coins = await Coins.find({}, 'symbol', { lean: true }).exec();
//         if (coins && coins.length > 0) {
//             let coin;
//             let coinEth;
//
//             const coinIdx = coins.findIndex(coin => coin.symbol === 'COIN');
//             if (coinIdx > -1) {
//                 coin = coins[coinIdx];
//             }
//
//             const coinEthIdx = coins.findIndex(coin => coin.symbol === 'ETH');
//             if (coinEthIdx > -1) {
//                 coinEth = coins[coinEthIdx];
//             }
//
//             const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
//             if (accounts && accounts.length > 0) {
//                 accounts.forEach(account => {
//                     if (coinEth) {
//                         Web3Service.getBalance(account.beneficiary)
//                             .then(balance => {
//                                 Wallets.findOne({ accountId: account._id, coinId: coinEth._id }, (err, wallet) => {
//                                     if (err) {
//                                         console.log('getWalletWeb3: Wallets.findOne: ', err);
//                                         return;
//                                     }
//
//                                     if (wallet) {
//                                         wallet.set({ quantity: balance });
//                                     } else {
//                                         wallet = new Wallets({
//                                             accountId: account._id,
//                                             coinId: coinEth._id,
//                                             quantity: balance
//                                         });
//                                     }
//
//                                     wallet.save(err => {
//                                         if (err) {
//                                             console.log('getWalletWeb3: wallet.save: ', err);
//                                         }
//                                     });
//                                 });
//                             })
//                             .catch(err => {
//                                 console.log('getWalletWeb3: getBalance: ', err);
//                             });
//                     }
//
//                     if (coin) {
//                         TruffleService.coinBalance(account.beneficiary)
//                             .then(balance => {
//                                 Wallets.findOne({ accountId: account._id, coinId: coin._id }, (err, wallet) => {
//                                     if (err) {
//                                         console.log('getWalletWeb3: Wallets.findOne: ', err);
//                                         return;
//                                     }
//
//                                     if (wallet) {
//                                         wallet.set({ quantity: balance });
//                                     } else {
//                                         wallet = new Wallets({
//                                             accountId: account._id,
//                                             coinId: coin._id,
//                                             quantity: balance
//                                         });
//                                     }
//
//                                     wallet.save(err => {
//                                         if (err) {
//                                             console.log('getWalletWeb3: wallet.save: ', err);
//                                         }
//                                     });
//                                 });
//                             })
//                             .catch(err => {
//                                 console.log('getWalletWeb3: coinBalance: ', err);
//                             });
//
//                         TruffleService.coinBalanceOther(account.beneficiary, COINVEST_TOKEN_ADDRESS_V1)
//                             .then(async balance => {
//                                 CoinWallets.findOne({ accountId: account._id, version: 'v1' }, (err, wallet) => {
//                                     if (err) {
//                                         console.log('getWalletWeb3: CoinWallets.v1: ', err);
//                                         return;
//                                     }
//
//                                     if (wallet) {
//                                         wallet.set({ quantity: balance });
//                                     } else {
//                                         wallet = new CoinWallets({
//                                             accountId: account._id,
//                                             version: 'v1',
//                                             quantity: balance
//                                         });
//                                     }
//
//                                     wallet.save(err => {
//                                         if (err) {
//                                             console.log('getWalletWeb3 - v1.save: ', err);
//                                         }
//                                     });
//                                 });
//                             })
//                             .catch(err => {
//                                 console.log('getWalletWeb3 - v1: ', err);
//                             });
//
//                         TruffleService.coinBalanceOther(account.beneficiary, COINVEST_TOKEN_ADDRESS_V3)
//                             .then(async balance => {
//                                 CoinWallets.findOne({ accountId: account._id, version: 'v3' }, (err, wallet) => {
//                                     if (err) {
//                                         console.log('getWalletWeb3: CoinWallets.v3: ', err);
//                                         return;
//                                     }
//
//                                     if (wallet) {
//                                         wallet.set({ quantity: balance });
//                                     } else {
//                                         wallet = new CoinWallets({
//                                             accountId: account._id,
//                                             version: 'v3',
//                                             quantity: balance
//                                         });
//                                     }
//
//                                     wallet.save(err => {
//                                         if (err) {
//                                             console.log('getWalletWeb3 - v3.save: ', err);
//                                         }
//                                     });
//                                 });
//                             })
//                             .catch(err => {
//                                 console.log('getWalletWeb3 - v3: ', err);
//                             });
//                     }
//                 });
//             }
//         }
//     } catch (e) {
//         console.log('getWalletWeb3: ', e);
//     }
// };

/**
 * Promise function to get Eth balance
 */
// const asyncEthMultiple = (address, idx) => {
//     const url = `${ETHSCAN_URI}&action=balancemulti&tag=latest&apikey=${ETHSCAN_API_KEY1}&address=`;
//
//     return new Promise(resolve => {
//         // Add some delay for each request because of etherscan rate limit
//         setTimeout(() => {
//             request(`${url}${address.toString()}`, (err, response) => {
//                 if (err) {
//                     console.log('asyncEthMultiple: ', err);
//                     resolve(null);
//                 }
//
//                 try {
//                     if (response.statusCode === 200) {
//                         const data = JSON.parse(response.body);
//                         resolve(data.result);
//                     } else {
//                         resolve(null);
//                     }
//                 } catch (e) {
//                     console.log('asyncEthMultiple: ', err);
//                     resolve(null);
//                 }
//             });
//         }, 100 * idx);
//     });
// };

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
        if (!coins || coins.length === 0) {
            recallGetEthWallet();
            return;
        }

        const coinEthIdx = coins.findIndex(coin => coin.symbol === 'ETH');
        if (coinEthIdx === -1) {
            recallGetEthWallet();
            return;
        }

        const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
        if (!accounts || accounts.length === 0) {
            recallGetEthWallet();
            return;
        }

        const wallets = await Wallets.find({ coinId: coins[coinEthIdx]._id }).exec();
        if (!wallets || wallets.length === 0) {
            recallGetEthWallet();
            return;
        }

        const actions = wallets.map((wallet, idx) => {
            const accountIdx = accounts.findIndex(a => a._id == wallet.accountId);
            if (accountIdx > -1) {
                return asyncEthMultiple(wallet, accounts[accountIdx].beneficiary, idx);
            }

            return new Promise(resolve => {
                resolve();
            });
        });

        Promise.all(actions)
            .then(() => {
                recallGetEthWallet();
            })
            .catch(e => {
                console.log('getEthWallet: ', e);

                recallGetEthWallet();
            });
    } catch (e) {
        console.log('getEthWallet: ', e);

        recallGetEthWallet();
    }
};

const recallGetEthWallet = () => {
    setTimeout(() => {
        getEthWallet();
    }, 5000);
};

/**
 * Promise function to get Token balance
 */
// const asyncTokenMultiple = (wallet, beneficiary, contractAddress, idx) => {
//     const url = `${ETHSCAN_URI}&action=tokenbalance&tag=latest&apikey=${ETHSCAN_API_KEY2}&address=${beneficiary}&contractaddress=${contractAddress}`;
//
//     return new Promise(resolve => {
//         // Add some delay for each request because of etherscan rate limit
//         setTimeout(() => {
//             request(url, (err, response) => {
//                 if (err) {
//                     console.log('asyncTokenMultiple: ', err);
//                     resolve();
//                 }
//
//                 try {
//                     if (response.statusCode === 200) {
//                         const data = JSON.parse(response.body);
//                         wallet.quantity = data.result;
//                         wallet.latest = new Date().toUTCString();
//                         wallet.save(err => {
//                             if (err) {
//                                 console.log('asyncTokenMultiple - save: ', err);
//                             }
//                         });
//                         resolve();
//                     } else {
//                         resolve();
//                     }
//                 } catch (e) {
//                     console.log('asyncTokenMultiple: ', err);
//                     resolve();
//                 }
//             });
//         }, 100 * idx);
//     });
// };

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
    }, 100 * idx);
});

const getTokenWallet = async () => {
    try {
        const coins = await Coins.find({}, 'symbol', { lean: true }).exec();
        if (!coins || coins.length === 0) {
            recallGetEthWallet();
            return;
        }

        const coinEthIdx = coins.findIndex(coin => coin.symbol === 'ETH');
        if (coinEthIdx === -1) {
            recallGetEthWallet();
            return;
        }

        const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
        if (!accounts || accounts.length === 0) {
            recallGetEthWallet();
            return;
        }

        const wallets = await Wallets.find({ coinId: { $ne: coins[coinEthIdx]._id } }).exec();
        if (!wallets || wallets.length === 0) {
            recallGetEthWallet();
            return;
        }

        const actions = wallets.map((wallet, idx) => {
            const accountIdx = accounts.findIndex(a => a._id == wallet.accountId);
            if (accountIdx > -1) {
                const coinIdx = coins.findIndex(c => c._id == wallet.coinId);
                if (coinIdx > -1) {
                    let contractAddress = '';
                    if (coins[coinIdx].symbol === 'COIN') {
                        contractAddress = COINVEST_TOKEN_ADDRESS;
                    } else {
                        const tokenIdx = tokenList.findIndex(t => t.symbol === coins[coinIdx].symbol);
                        if (tokenIdx > -1) {
                            contractAddress = tokenList[tokenIdx].address;
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

        Promise.all(actions)
            .then(() => {
                recallGetTokenWallet();
            })
            .catch(e => {
                console.log('getTokenWallet: ', e);

                recallGetTokenWallet();
            });
    } catch (e) {
        console.log('getTokenWallet: ', e);

        recallGetTokenWallet();
    }
};

const recallGetTokenWallet = () => {
    setTimeout(() => {
        getTokenWallet();
    }, 5000);
};

/**
 * Promise function to get COIN v1 balance
 */
// const asyncCoinV1Multiple = (wallet, beneficiary, idx) => {
//     const url = `${ETHSCAN_URI}&action=tokenbalance&tag=latest&apikey=${ETHSCAN_API_KEY3}&address=${beneficiary}&contractaddress=${COINVEST_TOKEN_ADDRESS_V1}`;
//
//     return new Promise(resolve => {
//         // Add some delay for each request because of etherscan rate limit
//         setTimeout(() => {
//             request(url, (err, response) => {
//                 if (err) {
//                     console.log('asyncCoinV1Multiple: ', err);
//                     resolve();
//                 }
//
//                 try {
//                     if (response.statusCode === 200) {
//                         const data = JSON.parse(response.body);
//                         wallet.quantity = data.result;
//                         wallet.latest = new Date().toUTCString();
//                         wallet.save(err => {
//                             if (err) {
//                                 console.log('asyncCoinV1Multiple - save: ', err);
//                             }
//                         });
//                         resolve();
//                     } else {
//                         resolve();
//                     }
//                 } catch (e) {
//                     console.log('asyncCoinV1Multiple: ', err);
//                     resolve();
//                 }
//             });
//         }, 100 * idx);
//     });
// };

const asyncCoinV1Multiple = (wallet, beneficiary, idx) => new Promise(resolve => {
    setTimeout(() => {
        TruffleService.coinBalanceOther(beneficiary, COINVEST_TOKEN_ADDRESS_V1)
            .then(balance => {
                wallet.quantity = balance;
                wallet.latest = new Date().toUTCString();
                wallet.save(err => {
                    if (err) {
                        console.log('asyncCoinV1Multiple - save: ', err);
                    }
                });
                resolve();
            })
            .catch(err => {
                console.log('asyncCoinV1Multiple: ', err);
                resolve();
            });
    }, 100 * idx);
});

const getCoinV1Wallet = async () => {
    try {
        const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
        if (!accounts || accounts.length === 0) {
            recallGetCoinV1Wallet();
            return;
        }

        const wallets = await CoinWallets.find({ version: 'v1' }).exec();
        if (!wallets || wallets.length === 0) {
            recallGetCoinV1Wallet();
            return;
        }

        const actions = wallets.map((wallet, idx) => {
            const accountIdx = accounts.findIndex(a => a._id == wallet.accountId);
            if (accountIdx > -1) {
                return asyncCoinV1Multiple(wallet, accounts[accountIdx].beneficiary, idx);
            }

            return new Promise(resolve => {
                resolve();
            });
        });

        Promise.all(actions)
            .then(() => {
                recallGetCoinV1Wallet();
            })
            .catch(e => {
                console.log('getCoinV1Wallet: ', e);

                recallGetCoinV1Wallet();
            });
    } catch (e) {
        console.log('getCoinV1Wallet: ', e);

        recallGetCoinV1Wallet();
    }
};

const recallGetCoinV1Wallet = () => {
    setTimeout(() => {
        getCoinV1Wallet();
    }, 5000);
};

/**
 * Promise function to get COIN v3 balance
 */
// const asyncCoinV3Multiple = (wallet, beneficiary, idx) => {
//     const url = `${ETHSCAN_URI}&action=tokenbalance&tag=latest&apikey=${ETHSCAN_API_KEY4}&address=${beneficiary}&contractaddress=${COINVEST_TOKEN_ADDRESS_V3}`;
//
//     return new Promise(resolve => {
//         // Add some delay for each request because of etherscan rate limit
//         setTimeout(() => {
//             request(url, (err, response) => {
//                 if (err) {
//                     console.log('asyncCoinV3Multiple: ', err);
//                     resolve();
//                 }
//
//                 try {
//                     if (response.statusCode === 200) {
//                         const data = JSON.parse(response.body);
//                         wallet.quantity = data.result;
//                         wallet.latest = new Date().toUTCString();
//                         wallet.save(err => {
//                             if (err) {
//                                 console.log('asyncCoinV3Multiple - save: ', err);
//                             }
//                         });
//                         resolve();
//                     } else {
//                         resolve();
//                     }
//                 } catch (e) {
//                     console.log('asyncCoinV3Multiple: ', err);
//                     resolve();
//                 }
//             });
//         }, 100 * idx);
//     });
// };

const asyncCoinV3Multiple = (wallet, beneficiary, idx) => new Promise(resolve => {
    setTimeout(() => {
        TruffleService.coinBalanceOther(beneficiary, COINVEST_TOKEN_ADDRESS_V3)
            .then(balance => {
                wallet.quantity = balance;
                wallet.latest = new Date().toUTCString();
                wallet.save(err => {
                    if (err) {
                        console.log('asyncCoinV3Multiple - save: ', err);
                    }
                });
                resolve();
            })
            .catch(err => {
                console.log('asyncCoinV3Multiple: ', err);
                resolve();
            });
    }, 100 * idx);
});

const getCoinV3Wallet = async () => {
    try {
        const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
        if (!accounts || accounts.length === 0) {
            recallGetCoinV3Wallet();
            return;
        }

        const wallets = await CoinWallets.find({ version: 'v3' }).exec();
        if (!wallets || wallets.length === 0) {
            recallGetCoinV3Wallet();
            return;
        }

        const actions = wallets.map((wallet, idx) => {
            const accountIdx = accounts.findIndex(a => a._id == wallet.accountId);
            if (accountIdx > -1) {
                return asyncCoinV3Multiple(wallet, accounts[accountIdx].beneficiary, idx);
            }

            return new Promise(resolve => {
                resolve();
            });
        });

        Promise.all(actions)
            .then(() => {
                recallGetCoinV3Wallet();
            })
            .catch(e => {
                console.log('getCoinV3Wallet: ', e);

                recallGetCoinV3Wallet();
            });
    } catch (e) {
        console.log('getCoinV3Wallet: ', e);

        recallGetCoinV3Wallet();
    }
};

const recallGetCoinV3Wallet = () => {
    setTimeout(() => {
        getCoinV3Wallet();
    }, 5000);
};

/**
 * Get token transactions
 */
const asyncTokenTransactionMultiple = (account, idx) => {
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
        if (!coins || coins.length === 0) {
            recallGetTokenTransactions();
            return;
        }

        const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
        if (!accounts || accounts.length === 0) {
            recallGetTokenTransactions();
            return;
        }

        const actions = accounts.map(asyncTokenTransactionMultiple);

        Promise.all(actions)
            .then(data => data.filter(item => !!item))
            .then(data => {
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

                recallGetTokenTransactions();
            })
            .catch(e => {
                console.log('getTokenTransactions: ', e);

                recallGetTokenTransactions();
            });
    } catch (e) {
        console.log('getTokenTransactions: ', e);

        recallGetTokenTransactions();
    }
};

const recallGetTokenTransactions = () => {
    setTimeout(() => {
        getTokenTransactions();
    }, 30000);
};

/**
 * Get Ether transactions
 */
const asyncEthTransactionMultiple = (account, idx) => {
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
        if (!coin) {
            recallGetEtherTransactions();
            return;
        }

        const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
        if (!accounts || accounts.length === 0) {
            recallGetEtherTransactions();
            return;
        }

        const actions = accounts.map(asyncEthTransactionMultiple);

        Promise.all(actions)
            .then(data => data.filter(item => !!item))
            .then(data => {
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

                recallGetEtherTransactions();
            })
            .catch(e => {
                console.log('getEtherTransactions: ', e);

                recallGetEtherTransactions();
            });
    } catch (e) {
        console.log('getEtherTransactions: ', e);

        recallGetEtherTransactions();
    }
};

const recallGetEtherTransactions = () => {
    setTimeout(() => {
        getEtherTransactions();
    }, 30000);
};

exports.walletSchedule = () => {
    getEthWallet();

    setTimeout(getTokenWallet, 1000);

    setTimeout(getCoinV1Wallet, 2000);

    setTimeout(getCoinV3Wallet, 3000);

    setTimeout(getTokenTransactions, 4000);

    setTimeout(getEtherTransactions, 5000);
};
