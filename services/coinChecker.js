import { COINVEST_TOKEN_ADDRESS_V1, COINVEST_TOKEN_ADDRESS_V2, COINVEST_TOKEN_ADDRESS_V3, ETHSCAN_API_KEY1, ETHSCAN_API_KEY2, ETHSCAN_API_KEY3 } from './Config';

const es = require('./etherscan/etherscan');

export const getCoinVersion = async beneficiary => {
    let version;
    let tokens;
    let balance;
    let balances = [];
    let versions = [];

    const contractAddresses = [COINVEST_TOKEN_ADDRESS_V1, COINVEST_TOKEN_ADDRESS_V2, COINVEST_TOKEN_ADDRESS_V3];
    const apiKeys = [ETHSCAN_API_KEY1, ETHSCAN_API_KEY2, ETHSCAN_API_KEY3];
    const api = es(ETHSCAN_API_KEY1);

    try {
        // balance = await api.account.tokentx(beneficiary);
        await Promise.all(contractAddresses.map(async (contractAddress) => {
            sleep(1000);
            balance = await api.account.tokenbalance(beneficiary, contractAddress);
            balances.push(balance.result);
        }));

        balances.forEach((balance, index) => {
            if (balance !== 0 && balance !== "0") {
                versions.push('v' + index);
            }
        });

        return versions;
    } catch (error) {
        console.log(`[CoinChecker] Error fetching token: ${error}`);
    }
};

function sleep( millisecondsToWait ) {
    let now = new Date().getTime();
    while (new Date().getTime() < now + millisecondsToWait) {
        /* do nothing; this will exit once it reaches the time limit */
        /* if you want you could do something and exit */
    }
};