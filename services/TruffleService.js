const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.myetherapi.com/rop'));

const contract = require('truffle-contract');
const BigNumber = require('bignumber.js');

const {
    FAUCET_ADDRESS,
    INVESTMENT_CONTRACT_ADDRESS,
    COINVEST_TOKEN_ADDRESS,
    DEMO_MASTER_ADDRESS,
    DEMO_MASTER_PASSPHRASE,
    Abi,
    FaucetAbi,
    CoinvestTokenAbi,
    UserDataAbi,
    cryptoIdToSymbol
} = require('./Config');

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
        return InvestmentContract.currentProvider.send.apply(
            InvestmentContract.currentProvider, arguments
        );
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
        return TokenContract.currentProvider.send.apply(
            TokenContract.currentProvider, arguments
        );
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
        return FaucetContract.currentProvider.send.apply(
            FaucetContract.currentProvider, arguments
        );
    };
}

// Generate FaucetContract
const UserDataContract = contract({
    abi: UserDataAbi,
    gas: 1000000
});
UserDataContract.setProvider(web3.currentProvider);
UserDataContract.defaults({
    from: DEMO_MASTER_ADDRESS,
    gas: 1000000,
    gasPrice: 40000000000
});
if (typeof UserDataContract.currentProvider.sendAsync !== 'function') {
    UserDataContract.currentProvider.sendAsync = function () {
        return UserDataContract.currentProvider.send.apply(
            UserDataContract.currentProvider, arguments
        );
    };
}

const holdings = function (address) {
    const UserDataContractInstance = UserDataContract.at(INVESTMENT_CONTRACT_ADDRESS);

    return new Promise((resolve, reject) => {
        UserDataContractInstance.returnHoldings(address)
            .then(result => {
                resolve(result);
            })
            .catch(err => {
                console.log('Truffle holdings: ', err);
                reject(err);
            });
    });
};

const coinBalance = (address) => {
    const TokenContractInstance = TokenContract.at(COINVEST_TOKEN_ADDRESS);

    return new Promise((resolve, reject) => {
        TokenContractInstance.balanceOf(address)
            .then(result => {
                if (result.c.length > 1) {
                    resolve(result.c['0'] + '' + result.c['1']);
                } else {
                    resolve(result.c['0'] + '00000000000000');
                }
            })
            .catch(err => {
                console.log('Truffle coinBalance: ', err);
                reject(err);
            });
    });
};