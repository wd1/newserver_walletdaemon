import _ from 'lodash';
import Accounts from '../models/Accounts';
import Wallets from '../models/Wallets';
import Coins from '../models/Coins';
import { getAddressBalances, getAddressesBalances } from '../services/balanceChecker';

export const fetchBalances = async () => {
    console.log(`------------- Synchronizing Eth/Token Balances ------------`);

    try {
        const batchSize = 30;
        const batches = [];
        const coins = await Coins.find({}, 'symbol address', { lean: true }).exec();
        const coinEthIdx = coins.findIndex(coin => coin.symbol === 'ETH');
        const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
        const wallets = await Wallets.find({ coinId: { $ne: coins[coinEthIdx]._id } }).exec();

        if (accounts.length > batchSize) {
            for (let i = 0; i < accounts.length / batchSize; i++) {
                const batch = [];
                for (let j = 0; j < batchSize; j++) {
                    if (accounts[i * batchSize + j]) {
                        batch.push(accounts[i * batchSize + j].beneficiary);
                    }
                }
                batches.push(batch);
            }
        } else {
            const batch = [];
            for (let j = 0; j < accounts.length; j++) {
                batch.push(accounts[j].beneficiary);
            }
            batches.push(batch);
        }

        const tokenAddresses = wallets.map(wallet => {
            const coin = _.find(coins, {_id: wallet.coinId});
            return coin ? coin.address : null;
        }).filter(addr => !!addr);
        tokenAddresses.push('0x0'); // add ether

        await Promise.all(batches.map(async batch => {
            const balances = await getAddressesBalances(batch, tokenAddresses);
            console.log(`===================`);
            console.log(balances);
            return Promise.all(Object.keys(balances).map(address => {
                const balancesForAddress = balances.address;
                const account = accounts.find(item => item.beneficiary === address);
                return Promise.all(Object.keys(balancesForAddress).map(async tokenAddr => {
                    const coinIndex = (tokenAddr === '0x0') ? coinEthIdx : coins.findIndex(coin => coin.address === tokenAddr);
                    if (coinIndex > -1 && balances[tokenAddr]) {
                        let wallet = await Wallets.findOne({accountId: account._id, coinId: coins[coinIndex]._id});

                        // if wallet isn't existed, create new for eth wallet, ignore for token wallet
                        if (!wallet && tokenAddr === '0x0') {
                            wallet = new Wallets({
                                accountId: account._id,
                                coinId: coins[coinIndex]._id
                            });
                        }

                        if (wallet) {
                            wallet.amount = balances[tokenAddr];
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
