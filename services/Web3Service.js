const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.GETH));

const { bignumberToString } = require('./bignumber2string');

const {
    DEMO_MASTER_ADDRESS,
    DEMO_MASTER_PASSPHRASE
} = require('./Config');

web3.eth.personal.unlockAccount(DEMO_MASTER_ADDRESS, DEMO_MASTER_PASSPHRASE, 0)
    .then(response => {
        if (response) {
            console.log('Unlocked the master account');
        } else {
            console.log('Failed to unlock the master account');
        }
    })
    .catch(err => {
        console.log('Truffle unlockAccount: ', err);
    });

exports.web3 = web3;

exports.getNonce = address => web3.eth.getTransactionCount(address);

exports.sendSignedTransaction = signedTransactionData => new Promise((resolve, reject) => {
    web3.eth.sendSignedTransaction(signedTransactionData)
        .on('transactionHash', hash => {
            resolve(hash);
        })
        .on('error', err => {
            console.log('sendSignedTransaction: ', err);
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
        console.log('result: ', result);

        if (err) {
            console.log('Web3Service filter: ', err);
            reject(err);
        }

        resolve(result);
    });
});
