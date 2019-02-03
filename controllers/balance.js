import _ from 'lodash';
import Accounts from '../models/Accounts';
import Wallets from '../models/Wallets';
import Coins from '../models/Coins';
import { getAddressBalances, getAddressesBalances } from '../services/balanceChecker';
import { COINVEST_TOKEN_ADDRESS_V1, COINVEST_TOKEN_ADDRESS_V2, COINVEST_TOKEN_ADDRESS_V3, COINVEST_TOKEN_ADDRESS, BATCH_SIZE } from '../services/Config';

export const fetchBalances = async () => {
    console.log(`\n------------- Synchronizing Eth/Token Balances ------------`);

    try {
        const batches = [];
        const coins = await Coins.find({}, 'symbol address', { lean: true }).exec();
        const coinEthIdx = coins.findIndex(coin => coin.symbol === 'ETH');
        const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();

        if (accounts.length > BATCH_SIZE) {
            for (let i = 0; i < accounts.length / BATCH_SIZE; i++) {
                const batch = [];
                for (let j = 0; j < BATCH_SIZE; j++) {
                    if (accounts[i * BATCH_SIZE + j]) {
                        batch.push(accounts[i * BATCH_SIZE + j]);
                    }
                }

                if (batch.length) batches.push(batch);
            }
        } else {
            const batch = [];
            for (let j = 0; j < accounts.length; j++) {
                batch.push(accounts[j]);
            }

            if (batch.length) batches.push(batch);
        }

        await Promise.all(batches.map(async batch => {
            const addresses = batch.map(item => item.beneficiary);
            const accountIds = batch.map(item => item._id);
            const userWallets = await Wallets.find({accountId: accountIds});
            const tokenAddresses = userWallets.map(wallet => {
                const coin = coins.find(coin => coin._id == wallet.coinId);
                if (coin && coin.symbol === 'COIN') {
                    if (wallet.version === 'v1') {
                        return COINVEST_TOKEN_ADDRESS_V1;
                    } else if (wallet.version === 'v2') {
                        return COINVEST_TOKEN_ADDRESS_V2;
                    } else if (wallet.version === 'v3') {
                        return COINVEST_TOKEN_ADDRESS_V3;
                    }
                }

                return coin ? coin.address : null;
            }).filter((addr, pos, arr) => !!addr && arr.indexOf(addr) == pos);  // remove duplicates
            tokenAddresses.push('0x0000000000000000000000000000000000000000'); // add ether

            // log
            console.log(`\n[BalanceDaemon] Fetching Balances for ${accounts.length} accounts, ${batch.length} addresses and ${tokenAddresses.length} Tokens per batch`);

            const balances = await getAddressesBalances(addresses, tokenAddresses);
            // console.log(balances);

            return Promise.all(batch.map(account => {
                const balancesForAddress = balances[account.beneficiary];
                return Promise.all(tokenAddresses.map(async tokenAddr => {
                    let coin;
                    let version = null;

                    if (tokenAddr == '0x0000000000000000000000000000000000000000') {
                        coin = coins[coinEthIdx];
                    } else if (tokenAddr.toLowerCase() == COINVEST_TOKEN_ADDRESS_V1.toLowerCase()) {
                        coin = coins.find(coin => coin.symbol === 'COIN');
                        version = 'v1';
                    } else if (tokenAddr.toLowerCase() == COINVEST_TOKEN_ADDRESS_V2.toLowerCase()) {
                        coin = coins.find(coin => coin.symbol === 'COIN');
                        version = 'v2';
                    } else if (tokenAddr.toLowerCase() == COINVEST_TOKEN_ADDRESS_V3.toLowerCase()) {
                        coin = coins.find(coin => coin.symbol === 'COIN');
                        version = 'v3';
                    } else {
                        coin = coins.find(coin => coin.address === tokenAddr);
                    }

                    if (coin && balancesForAddress[tokenAddr]) {
                        let wallet = null;
                        if (version) {
                            wallet = await Wallets.findOne({accountId: account._id, coinId: coin._id, version});
                        } else {
                            wallet = await Wallets.findOne({accountId: account._id, coinId: coin._id});
                        }

                        // if wallet isn't existed, create new for eth wallet, ignore for token wallet
                        if (!wallet && tokenAddr == '0x0000000000000000000000000000000000000000') {
                            wallet = new Wallets({
                                accountId: account._id,
                                coinId: coin._id
                            });
                        }

                        if (wallet) {
                            wallet.quantity = balancesForAddress[tokenAddr];
                            wallet.latest = new Date().toUTCString();
                            return wallet.save();
                        }
                    }
                }));
            }));
        }));
    } catch (error) {
        console.log(`[BalanceDaemon] Error fetching balances ${error}`);
    }

    setTimeout(fetchBalances, 15000);
};
