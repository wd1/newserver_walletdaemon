const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const {
    DEMO_MASTER_ADDRESS,
    DEMO_MASTER_PASSPHRASE,
    GETH
} = require('./Config');

const web3 = new Web3(new Web3.providers.HttpProvider(GETH));
const { bignumberToString } = require('./bignumber2string');
const { logger } = require('../services/logger');

exports.unlockMasterAccount = () => new Promise((resolve, reject) => {
    const pause = duration => new Promise(res => setTimeout(res, duration));

    web3.eth.personal.unlockAccount(DEMO_MASTER_ADDRESS, DEMO_MASTER_PASSPHRASE, 0)
        .then(response => {
            if (response) {
                logger.log('info', { label: 'Web3Service', message: 'Unlocked the master account' });
                resolve(response);
            } else {
                throw new Error("Failed to unlock the master account");
            }
        })
        .catch(err => {
            logger.log('error', { label: 'Web3Service', message: `Failed to unlock the master account: ${err}` });
            logger.log('error', { label: 'Web3Service', message: 'Retrying master account unlock in 5s.' });
            pause(5000).then(() =>
                exports.unlockMasterAccount()
                    .then(resolve)
                    .catch(reject));
        });
});

exports.web3 = web3;

exports.getNonce = address => web3.eth.getTransactionCount(address);

exports.sendSignedTransaction = signedTransactionData => new Promise((resolve, reject) => {
    web3.eth.sendSignedTransaction(signedTransactionData)
        .on('transactionHash', hash => {
            resolve(hash);
        })
        .on('error', err => {
            logger.log('error', { label: 'Web3Service', message: `sendSignedTransaction error: ${err}` });

            reject(err);
        });
});

exports.encodeFunctionSignature = functionName => web3.eth.abi.encodeFunctionSignature(functionName);

exports.encodeFunctionCall = (jsonInterface, parameters) => web3.eth.abi.encodeFunctionCall(jsonInterface, parameters);

exports.sign = (dataToSign, address, privateKey) => web3.eth.accounts.sign(dataToSign, privateKey);

exports.fromWei = (amount, unit = 'ether') => web3.utils.fromWei(`${amount}`, unit);

exports.toWei = (amount, unit = 'ether') =>
    // return web3.utils.toWei(`${amount}`, unit);
    bignumberToString(new BigNumber(amount.toFixed(18)).times(new BigNumber(10).exponentiatedBy(18)));

exports.getBalance = address => new Promise((resolve, reject) => {
    web3.eth.getBalance(address, (err, weiBalance) => {
        if (err) {
            reject(err);
        }

        resolve(weiBalance);
    });
});

exports.isEqualAddress = (a, b) => !!a && !!b && (a.toLowerCase() === b.toLowerCase());

exports.filter = address => new Promise((resolve, reject) => {
    web3.eth.filter({
        address,
        fromBlock: 396958,
        toBlock: 'latest'
    }).get((err, result) => {
        logger.log('info', { label: 'Web3Service', message: `Filter result: ${result}` });

        if (err) {
            logger.log('error', { label: 'Web3Service', message: `Filter error: ${err}` });

            reject(err);
        }

        resolve(result);
    });
});
