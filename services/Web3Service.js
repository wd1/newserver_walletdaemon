const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.myetherapi.com/rop'));

const getBalance = (address) => {
    return new Promise((resolve, reject) => {
        web3.eth.getBalance(address, (err, weiBalance) => {
            if (err) {
                console.log('getBalance: ' + err);
                reject(err);
            }

            resolve({ wei: weiBalance, eth: web3.utils.fromWei(weiBalance) });
        });
    });
};

const getCOINBalance = (address) => {
    return new Promise((resolve, reject) => {
        const coinvestContract = new web3.eth.Contract(
            CoinvestTokenAbi,
            COINVEST_TOKEN_ADDRESS,
            {
                from: DEMO_MASTER_ADDRESS,
                gas: 500000,
                gasPrice: '100000000000'
            }
        );

        coinvestContract.methods.balanceOf(address).call((err, response) => {
            if (err) {
                console.log('getCOINBalance: ' + err);
                reject(error);
            }

            resolve(web3.utils.toBN(response).div(web3.utils.toBN('1000000000000000000')).toString());
        });
    });
};

const cryptoAssets = (cryptoIdBn) => {
    return new Promise((resolve, reject) => {
        const coinvestContract = new web3.eth.Contract(Abi, INVESTMENT_CONTRACT_ADDRESS);

        coinvestContract.methods.cryptoAssets(cryptoIdBn).call((err, response) => {
            if (err) {
                console.log('cryptoAssets: ' + err);
                reject(error);
            }

            resolve(response);
        });
    });
};

const totalCryptos = (address) => {
    return new Promise((resolve, reject) => {
        const coinvestContract = new web3.eth.Contract(
            Abi,
            INVESTMENT_CONTRACT_ADDRESS,
            {
                from: address,
                gas: 500000,
                gasPrice: '100000000000'
            }
        );

        coinvestContract.methods.totalCryptos().call((err, response) => {
            if (err) {
                console.log('totalCryptos: ' + err);
                reject(error);
            }

            resolve(response);
        });
    });
};

const assetCoinValues = () => {
    return new Promise((resolve, reject) => {
        const coinvestContract = new web3.eth.Contract(Abi, INVESTMENT_CONTRACT_ADDRESS);

        let values = [];
        for (let i = 0; i < 10; i++) {
            coinvestContract.methods.calculateCoinValue(i, 1).call((err, result) => {
                if (err) {
                    console.log('assetCoinValues: ' + err);
                    values.push(0);
                } else {
                    values.push(result);
                }
            });
        }

        resolve(values);
    });
};
