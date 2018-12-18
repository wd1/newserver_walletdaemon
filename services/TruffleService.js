const contract = require('truffle-contract');
const standardAbi = require('human-standard-token-abi');

const { bignumberToString } = require('./bignumber2string');

const {
    INVESTMENT_CONTRACT_ADDRESS,
    COINVEST_TOKEN_ADDRESS,
    DEMO_MASTER_ADDRESS,
    Abi,
    FaucetAbi,
    CoinvestTokenAbi
} = require('./Config');

const { web3 } = require('./Web3Service');

// Generate InvestmentContract
const InvestmentContract = contract({
    abi: Abi,
    gas: 1000000
});
InvestmentContract.setProvider(web3.currentProvider);
InvestmentContract.defaults({
    from: DEMO_MASTER_ADDRESS,
    gas: 1000000,
    gasPrice: 40000000000
});
if (typeof InvestmentContract.currentProvider.sendAsync !== 'function') {
    InvestmentContract.currentProvider.sendAsync = function () {
        return InvestmentContract.currentProvider.send.apply(InvestmentContract.currentProvider, arguments);
    };
}

// Generate TokenContract
const TokenContract = contract({
    abi: CoinvestTokenAbi,
    gas: 1000000
});
TokenContract.setProvider(web3.currentProvider);
TokenContract.defaults({
    from: DEMO_MASTER_ADDRESS,
    gas: 1000000,
    gasPrice: 40000000000
});
if (typeof TokenContract.currentProvider.sendAsync !== 'function') {
    TokenContract.currentProvider.sendAsync = function () {
        return TokenContract.currentProvider.send.apply(TokenContract.currentProvider, arguments);
    };
}

// Generate TokenContract V1
const TokenContractOther = contract({
    abi: standardAbi,
    gas: 1000000
});
TokenContractOther.setProvider(web3.currentProvider);
TokenContractOther.defaults({
    from: DEMO_MASTER_ADDRESS,
    gas: 1000000,
    gasPrice: 40000000000
});
if (typeof TokenContractOther.currentProvider.sendAsync !== 'function') {
    TokenContractOther.currentProvider.sendAsync = function () {
        return TokenContractOther.currentProvider.send.apply(TokenContractOther.currentProvider, arguments);
    };
}

// Generate FaucetContract
const FaucetContract = contract({
    abi: FaucetAbi,
    gas: 1000000
});
FaucetContract.setProvider(web3.currentProvider);
FaucetContract.defaults({
    from: DEMO_MASTER_ADDRESS,
    gas: 1000000,
    gasPrice: 40000000000
});
if (typeof FaucetContract.currentProvider.sendAsync !== 'function') {
    FaucetContract.currentProvider.sendAsync = function () {
        return FaucetContract.currentProvider.send.apply(FaucetContract.currentProvider, arguments);
    };
}

exports.getNonce = address => {
    const TokenContractInstance = TokenContract.at(COINVEST_TOKEN_ADDRESS);

    return new Promise((resolve, reject) => {
        TokenContractInstance.getNonce(address)
            .then(nonce => {
                resolve(nonce);
            })
            .catch(err => {
                console.log('Truffle getNonce: ', err);
                reject(err);
            });
    });
};

exports.getPreSignedHash = (fn, value, extraData, gasPrice, nonce) => {
    const TokenContractInstance = TokenContract.at(COINVEST_TOKEN_ADDRESS);

    return new Promise((resolve, reject) => {
        TokenContractInstance.getPreSignedHash(fn, INVESTMENT_CONTRACT_ADDRESS, value, extraData, gasPrice, nonce)
            .then(txHash => {
                resolve(txHash);
            })
            .catch(err => {
                console.log('Truffle getPreSignedHash: ', err);
                reject(err);
            });
    });
};

exports.approveAndCallPreSigned = (fn, value, extraData, gasPrice, nonce) => {
    const TokenContractInstance = TokenContract.at(COINVEST_TOKEN_ADDRESS);

    return new Promise((resolve, reject) => {
        TokenContractInstance.approveAndCallPreSigned(fn, INVESTMENT_CONTRACT_ADDRESS, value, extraData, gasPrice, nonce)
            .then(txHash => {
                resolve(txHash);
            })
            .catch(err => {
                console.log('Truffle approveAndCallPreSigned: ', err);
                reject(err);
            });
    });
};

exports.recoverPreSigned = (sig, fn, value, extraData, gasPrice, nonce) => {
    const TokenContractInstance = TokenContract.at(COINVEST_TOKEN_ADDRESS);

    return new Promise((resolve, reject) => {
        TokenContractInstance.recoverPreSigned(sig, fn, INVESTMENT_CONTRACT_ADDRESS, value, extraData, gasPrice, nonce)
            .then(address => {
                resolve(address);
            })
            .catch(err => {
                console.log('Truffle recoverPreSigned: ', err);
                reject(err);
            });
    });
};

exports.coinBalance = address => {
    const TokenContractInstance = TokenContract.at(COINVEST_TOKEN_ADDRESS);

    return new Promise((resolve, reject) => {
        TokenContractInstance.balanceOf(address)
            .then(result => {
                resolve(bignumberToString(result));
            })
            .catch(err => {
                reject(err);
            });
    });
};

exports.eventsWatch = fromBlock => {
    const InvestmentContractInstance = InvestmentContract.at(INVESTMENT_CONTRACT_ADDRESS);
    const events = InvestmentContractInstance.allEvents({ fromBlock, toBlock: 'latest' });

    return new Promise((resolve, reject) => {
        events.get((err, response) => {
            if (err) reject(err);

            resolve(response);
        });
    });
};

exports.coinBalanceOther = (address, contractAddress) => {
    const TokenContractInstance = TokenContractOther.at(contractAddress);

    return new Promise((resolve, reject) => {
        TokenContractInstance.balanceOf(address)
            .then(result => {
                resolve(bignumberToString(result));
            })
            .catch(err => {
                reject(err);
            });
    });
};
