const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://geth.coinve.st:8545'));

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

exports.getNonce = (address) => {
    return web3.eth.getTransactionCount(address);
};

exports.sendSignedTransaction = (signedTransactionData) => {
    return new Promise((resolve, reject) => {
        web3.eth.sendSignedTransaction(signedTransactionData)
            .on('transactionHash', hash => {
                resolve(hash);
            })
            .on('error', err => {
                console.log('sendSignedTransaction: ', err);
                reject(err);
            })
    });
};

exports.encodeFunctionSignature = (functionName) => {
    return web3.eth.abi.encodeFunctionSignature(functionName);
};

exports.encodeFunctionCall = (jsonInterface, parameters) => {
    return web3.eth.abi.encodeFunctionCall(jsonInterface, parameters);
};

exports.sign = (dataToSign, address, privateKey) => {
    return web3.eth.accounts.sign(dataToSign, privateKey);
};

exports.fromWei = (amount) => {
    return web3.fromWei(amount, 'wei');
};

exports.getBalance = (address) => {
    return new Promise((resolve, reject) => {
        web3.eth.getBalance(address, (err, weiBalance) => {
            if (err) {
                console.log('getBalance: ', err);
                reject(err);
            }

            resolve({ wei: weiBalance, eth: web3.utils.fromWei(weiBalance) });
        });
    });
};

exports.filter = (address) => {
    return new Promise((resolve, reject) => {
        web3.eth.filter({
            address: address,
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
};