const request = require('request');
const schedule = require('node-schedule');

const Accounts = require('../models/Accounts');
const Wallets = require('../models/Wallets');
const Coins = require('../models/Coins');
const TokenTransactions = require('../models/TokenTransactions');

const Web3Service = require('../services/Web3Service');
const { COINVEST_TOKEN_ADDRESS, ApiKey } = require('../services/Config');

let updateWallet;
let updateTokenTransaction;
let updateEtherTransaction;

exports.walletSchedule = () => {
    updateWallet = schedule.scheduleJob('*/1 * * * *', getWallet);
    updateTokenTransaction = schedule.scheduleJob('*/1 * * * *', getTokenTransactions);
    updateEtherTransaction = schedule.scheduleJob('*/1 * * * *', getEtherTransactions);
};

exports.cancelWalletSchedule = () => {
    if (updateWallet) {
        updateWallet.cancel();
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

const getWallet = () => {
    try {
        Accounts.find((err, accounts) => {
            if (err) {
                if (err) {
                    console.log('getWallet: find: ', err);
                    return;
                }
            }

            const url = 'https://api-ropsten.etherscan.io/api?module=account&action=balance&tag=latest&apikey=' + ApiKey + '&address=';
            accounts.forEach(account => {
                request(url + account.beneficiary, (err, response) => {
                    if (err) {
                        console.log('getWallet: etherscan: ', err);
                        return;
                    }

                    if (response.statusCode === 200) {
                        const data = JSON.parse(response.body);

                        Coins.findOne({ symbol: 'ETH' }, (err, coin) => {
                            if (err) {
                                console.log('getWallet: Coins.findOne: ', err);
                                return;
                            }

                            if (coin) {
                                Wallets.findOne({ accountId: account._id, coinId: coin._id }, (err, wallet) => {
                                    if (err) {
                                        console.log('getWallet: Wallets.findOne: ', err);
                                        return;
                                    }

                                    if (wallet) {
                                        wallet.set({ quantity: data.result });
                                    } else {
                                        wallet = new Wallets({
                                            accountId: account._id,
                                            coinId: coin._id,
                                            quantity: data.result
                                        });
                                    }

                                    wallet.save(err => {
                                        if (err) {
                                            console.log('getWallet: save: ', err);
                                        }
                                    });
                                });

                                console.log('Wallet updated successfully.');
                            }
                        });
                    }
                });

                const coinUrl = 'https://api-ropsten.etherscan.io/api?module=account&action=tokenbalance&tag=latest&apikey=' + ApiKey + '&address=';
                request(coinUrl + account.beneficiary + '&contractaddress=' + COINVEST_TOKEN_ADDRESS, (err, response) => {
                    if (err) {
                        console.log('getWalletToken: etherscan: ', err);
                        return;
                    }

                    if (response.statusCode === 200) {
                        const data = JSON.parse(response.body);

                        Coins.findOne({ symbol: 'COIN' }, (err, coin) => {
                            if (err) {
                                console.log('getWalletToken: Coins.findOne: ', err);
                                return;
                            }

                            if (coin) {
                                Wallets.findOne({ accountId: account._id, coinId: coin._id }, (err, wallet) => {
                                    if (err) {
                                        console.log('getWalletToken: Wallets.findOne: ', err);
                                        return;
                                    }

                                    if (wallet) {
                                        wallet.set({ quantity: data.result });
                                    } else {
                                        wallet = new Wallets({
                                            accountId: account._id,
                                            coinId: coin._id,
                                            quantity: data.result
                                        });
                                    }

                                    wallet.save(err => {
                                        if (err) {
                                            console.log('getWalletToken: save: ', err);
                                        }
                                    });
                                });

                                console.log('Token Wallet updated successfully.');
                            }
                        });
                    }
                });
            });
        });
    } catch (err) {
        console.log('getWallet: catch: ', err);
    }
};

// Get wallets using Ethplorer
// const getWallet = () => {
//     Accounts.find((err, accounts) => {
//         if (err) {
//             if (err) {
//                 console.log('getWallet: find: ', err);
//                 return;
//             }
//         }
//
//         accounts.forEach(account => {
//             request('http://api.ethplorer.io/getAddressInfo/' + account.beneficiary + '?apiKey=ceyqw19101WDpvY73', (err, response) => {
//                 if (err) {
//                     console.log('getWallet: ethplorer: ', err);
//                     return;
//                 }
//
//                 if (response.statusCode === 200) {
//                     const data = JSON.parse(response.body);
//
//                     let tokens = [];
//                     tokens.push({
//                         symbol: 'ETH',
//                         quantity: data.ETH ? data.ETH.balance || 0 : 0
//                     });
//
//                     if (data.tokens) {
//                         data.tokens.forEach(token => {
//                             if (token.tokenInfo.name && token.tokenInfo.symbol) {
//                                 tokens.push({
//                                     symbol: token.tokenInfo.symbol,
//                                     quantity: token.balance
//                                 });
//                             }
//                         });
//                     }
//
//                     Coins.find((err, coins) => {
//                         if (err) {
//                             console.log('getWallet: find: ', err);
//                             return;
//                         }
//
//                         if (coins.length > 0) {
//                             tokens.forEach(token => {
//                                 let coinIndex = coins.findIndex(coin => coin.symbol === token.symbol);
//
//                                 if (coinIndex > -1) {
//                                     Wallets.findOne({ accountId: account._id, coinId: coins[coinIndex]._id }, (err, wallet) => {
//                                         if (err) {
//                                             console.log('getWallet: find: ', err);
//                                             return;
//                                         }
//
//                                         if (wallet) {
//                                             wallet.set({ quantity: token.quantity });
//                                         } else {
//                                             wallet = new Wallets({
//                                                 accountId: account._id,
//                                                 coinId: coins[coinIndex]._id,
//                                                 quantity: token.quantity
//                                             });
//                                         }
//
//                                         wallet.save(err => {
//                                             if (err) {
//                                                 console.log('getWallet: save: ', err);
//                                             }
//                                         });
//                                     });
//                                 }
//                             });
//
//                             console.log('Wallet updated successfully.');
//                         }
//                     });
//                 }
//             });
//         });
//     });
// };

const getTokenTransactions = () => {
    try {
        Coins.find((err, coins) => {
            if (err) {
                console.log('getTokenTransactions: Coins.find: ', err);
                return;
            }

            if (coins && coins.length > 0) {
                Accounts.find((err, accounts) => {
                    if (err) {
                        console.log('getTokenTransactions: Accounts.find: ', err);
                        return;
                    }

                    accounts.forEach(account => {
                        getTransactionRequest(account, 1, coins);
                    });
                });
            }
        });
    } catch (err) {
        console.log('getTokenTransactions: catch: ', err);
    }
};

const getTransactionRequest = (account, page, coins) => {
    try {
        const url = 'https://api-ropsten.etherscan.io/api?module=account&action=tokentx&startblock=0&endblock=latest&offset=10000&sort=desc&apikey=' + ApiKey + '&address=';
        request(url + account.beneficiary + '&page=' + page, async (err, response) => {
            if (err) {
                console.log('getTokenTransactions: etherscan: ', err);
                getTransactionRequest(account, page, coins);
                return;
            }

            if (response.statusCode === 200) {
                const data = JSON.parse(response.body);
                let allSaved = true;

                for (let i = 0; i < data.result.length; i++) {
                    const tx = data.result[i];

                    let action = '';
                    if (tx.from === account.beneficiary) {
                        action = 'send';
                    } else if (tx.to === account.beneficiary) {
                        action = 'receive';
                    }

                    let coinIndex = coins.findIndex(coin => coin.symbol === tx.tokenSymbol);
                    if (coinIndex > -1) {
                        try {
                            let tokenTransaction = await TokenTransactions.findOne({ accountId: account._id, txId: tx.hash }).exec();
                            if (!tokenTransaction) {
                                tokenTransaction = new TokenTransactions({
                                    accountId: account._id,
                                    coinId: coins[coinIndex]._id,
                                    amount: tx.value,
                                    timestamp: parseInt(tx.timeStamp),
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
                        } catch (err) {
                            console.log('getTokenTransactions: find: ', err);
                        }
                    }
                }

                if (data.result.length > 0) {
                    getTransactionRequest(account, page + 1, coins);
                }

                console.log('TokenTransactions updated successfully.');
            } else {
                getTransactionRequest(account, page, coins);
            }
        });
    } catch (err) {
        console.log('getTransactionRequest: catch: ', err);
    }
};

// Get transactions using Ethplorer
// const getTokenTransactions = () => {
//     Coins.find((err, coins) => {
//         if (err) {
//             console.log('getTokenTransactions: find: ', err);
//             return;
//         }
//
//         if (coins && coins.length > 0) {
//             Accounts.find((err, accounts) => {
//                 if (err) {
//                     console.log('getTokenTransactions: find: ', err);
//                     return;
//                 }
//
//                 accounts.forEach(account => {
//                     getTransactionRequest(account, null, coins);
//                 });
//             });
//         }
//     });
// };
//
// const getTransactionRequest = (account, timestamp, coins) => {
//     let url = 'http://api.ethplorer.io/getAddressHistory/' + account.beneficiary + '?apiKey=ceyqw19101WDpvY73&type=transfer&limit=1000';
//     if (timestamp) {
//         url += '&timestamp=' + timestamp;
//     }
//
//     request(url, async (err, response) => {
//         if (err) {
//             console.log('getTokenTransactions: ethplorer: ', err);
//             getTransactionRequest(account, timestamp, coins);
//             return;
//         }
//
//         if (response.statusCode === 200) {
//             const data = JSON.parse(response.body);
//
//             if (data.operations) {
//                 let allSaved = true;
//
//                 for (let i = 0; i < data.operations.length; i++) {
//                     const tx = data.operations[i];
//                     let action, from, to;
//
//                     if (tx.from === account.beneficiary) {
//                         action = 'send';
//                         from = account.beneficiary;
//                         if (account.beneficiary !== tx.tokenInfo.address) {
//                             to = tx.tokenInfo.address;
//                         } else {
//                             to = tx.to;
//                         }
//                     } else if (tx.to === account.beneficiary) {
//                         action = 'receive';
//                         to = account.beneficiary;
//                         if (account.beneficiary !== tx.tokenInfo.address) {
//                             from = tx.tokenInfo.address;
//                         } else {
//                             from = tx.from;
//                         }
//                     }
//
//                     if (action) {
//                         let coinIndex = coins.findIndex(coin => coin.symbol === tx.tokenInfo.symbol);
//                         if (coinIndex > -1) {
//                             try {
//                                 let tokenTransaction = TokenTransactions.findOne({ accountId: account._id, txId: tx.transactionHash }).exec();
//                                 if (!tokenTransaction) {
//                                     tokenTransaction = new TokenTransactions({
//                                         accountId: account._id,
//                                         coinId: coins[coinIndex]._id,
//                                         amount: tx.value / Math.pow(10, tx.tokenInfo.decimals),
//                                         timestamp: tx.timestamp,
//                                         txId: tx.transactionHash,
//                                         from,
//                                         to,
//                                         action
//                                     });
//
//                                     tokenTransaction.save(err => {
//                                         if (err) {
//                                             console.log('getTokenTransactions: save: ', err);
//                                         }
//                                     });
//
//                                     allSaved = false;
//                                 }
//                             } catch (err) {
//                                 console.log('getTokenTransactions: find: ', err);
//                             }
//                         }
//                     }
//                 }
//
//                 if (data.operations.length > 0 && !allSaved) {
//                     let tmp = data.operations[data.operations.length - 1].timestamp;
//                     getTransactionRequest(account, tmp, coins);
//                 }
//
//                 console.log('TokenTransactions updated successfully.');
//             }
//         } else {
//             getTransactionRequest(account, timestamp, coins);
//         }
//     });
// };

const getEtherTransactions = () => {
    try {
        Coins.findOne({ symbol: 'ETH' }, (err, coin) => {
            if (err) {
                console.log('getEtherTransactions: Coins.findOne: ', err);
                return;
            }

            if (coin) {
                Accounts.find((err, accounts) => {
                    if (err) {
                        console.log('getEtherTransactions: Accounts.find: ', err);
                        return;
                    }

                    accounts.forEach(account => {
                        getEtherTransactionsRequest(account, 1, coin);
                    });
                });
            }
        });
    } catch (err) {
        console.log('getEtherTransactions: catch: ', err);
    }
};

const getEtherTransactionsRequest = (account, page, coin) => {
    try {
        const url = 'https://api-ropsten.etherscan.io/api?module=account&action=txlist&startblock=0&endblock=latest&offset=10000&sort=desc&apikey=' + ApiKey + '&address=';
        request(url + account.beneficiary + '&page=' + page, async (err, response) => {
            if (err) {
                console.log('getEtherTransactions: etherscan: ', err);
                getEtherTransactionsRequest(account, page, coin);
                return;
            }

            if (response.statusCode === 200) {
                const data = JSON.parse(response.body);
                let allSaved = true;

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
                            let tokenTransaction = await TokenTransactions.findOne({ accountId: account._id, txId: tx.hash }).exec();
                            if (!tokenTransaction) {
                                tokenTransaction = new TokenTransactions({
                                    accountId: account._id,
                                    coinId: coin._id,
                                    amount: tx.value,
                                    timestamp: parseInt(tx.timeStamp),
                                    txId: tx.hash,
                                    from: tx.from,
                                    to: tx.to,
                                    action: action,
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

                if (data.result.length !== 0) {
                    getEtherTransactionsRequest(account, page + 1, coin);
                }

                console.log('Ether Transactions updated successfully.');
            } else {
                getEtherTransactionsRequest(account, page, coin);
            }
        });
    } catch (err) {
        console.log('getEtherTransactionsRequest: catch: ', err);
    }
};

// Get transactions using Ethplorer
// const getEtherTransactions = () => {
//     Coins.findOne({ symbol: 'ETH' }, (err, coin) => {
//         if (err) {
//             console.log('getEtherTransactions: findOne: ', err);
//             return;
//         }
//
//         if (coin) {
//             Accounts.find((err, accounts) => {
//                 if (err) {
//                     console.log('getEtherTransactions: find: ', err);
//                     return;
//                 }
//
//                 accounts.forEach(account => {
//                     getEtherTransactionsRequest(account, null, coin);
//                 });
//             });
//         }
//     });
// };
//
// const getEtherTransactionsRequest = (account, timestamp, coin) => {
//     let url = 'http://api.ethplorer.io/getAddressTransactions/' + account.beneficiary + '?apiKey=ceyqw19101WDpvY73&limit=1000';
//     if (timestamp) {
//         url += '&timestamp=' + timestamp;
//     }
//
//     request(url, async (err, response) => {
//         if (err) {
//             console.log('getEtherTransactions: ethplorer: ', err);
//             getEtherTransactionsRequest(account, timestamp, coin);
//             return;
//         }
//
//         if (response.statusCode === 200) {
//             const data = JSON.parse(response.body);
//             let allSaved = true;
//
//             for (let i = 0; i < data.length; i++) {
//                 const tx = data[i];
//
//                 let action;
//                 if (tx.from === account.beneficiary) {
//                     action = 'send';
//                 } else if (tx.to === account.beneficiary) {
//                     action = 'receive';
//                 }
//
//                 if (action) {
//                     try {
//                         let tokenTransaction = await TokenTransactions.findOne({ accountId: account._id, txId: tx.hash }).exec();
//                         if (!tokenTransaction) {
//                             tokenTransaction = new TokenTransactions({
//                                 accountId: account._id,
//                                 coinId: coin._id,
//                                 amount: tx.value,
//                                 timestamp: tx.timestamp,
//                                 txId: tx.hash,
//                                 from: tx.from,
//                                 to: tx.to,
//                                 action
//                             });
//
//                             tokenTransaction.save(err => {
//                                 if (err) {
//                                     console.log('getEtherTransactions: save: ', err);
//                                 }
//                             });
//
//                             allSaved = false;
//                         }
//                     } catch (err) {
//                         console.log('getEtherTransactions: find: ', err);
//                     }
//                 }
//             }
//
//             if (data.length > 0 && !allSaved) {
//                 let tmp = data[data.length - 1].timestamp;
//                 getEtherTransactionsRequest(account, tmp, coin);
//             }
//
//             console.log('Ether Transactions updated successfully.');
//         } else {
//             getEtherTransactionsRequest(account, timestamp, coin);
//         }
//     });
// };