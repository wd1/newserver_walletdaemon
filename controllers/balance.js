import _ from 'lodash';
import Accounts from '../models/Accounts';
import Wallets from '../models/Wallets';
import Coins from '../models/Coins';
import { getAddressesBalances } from '../services/balanceChecker';
import { COINVEST_TOKEN_ADDRESS_V1, COINVEST_TOKEN_ADDRESS_V2, COINVEST_TOKEN_ADDRESS_V3, COINVEST_TOKEN_ADDRESS } from '../services/Config';

export const fetchBalances = async () => {
    console.log(`\n------------- Synchronizing Eth/Token Balances ------------`);

    try {
        const batches = [];
        const ethAddress = '0x0000000000000000000000000000000000000000';
        const coins = await Coins.find({}, 'symbol address', { lean: true }).exec();
        const coinEthIdx = coins.findIndex(coin => coin.symbol === 'ETH');
        const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
        const userIds = accounts.map(account => account._id);
        const wallets = await Wallets.find({accountId: userIds}, 'coinId accountId version', {lean: true}).exec();

        // calculate count of tokens for each account
        accounts.forEach(account => {
            const walletsForAccount = wallets.filter(item => item.accountId == account._id);
            account.tokens = walletsForAccount.map(wallet => {
                const coin = coins.find(coin => coin._id == wallet.coinId);

                if (!coin) return null;
                if (coin.symbol === 'COIN') {
                    if (wallet.version === 'v1') {
                        return COINVEST_TOKEN_ADDRESS_V1;
                    } else if (wallet.version === 'v2') {
                        return COINVEST_TOKEN_ADDRESS_V2;
                    } else if (wallet.version === 'v3') {
                        return COINVEST_TOKEN_ADDRESS_V3;
                    }
                }

                return coin.address ? coin.address : null;
            }).filter((addr, pos, arr) => !!addr && arr.indexOf(addr) == pos);
        });

        // sort accounts by count of tokens
        accounts.sort((a, b) => b.tokens.length - a.tokens.length);

        // run greedy algorithm to split optimized [Am * Tn]
        let head = 0;
        let trail = accounts.length - 1;
        while (head < trail) {
            const headAccount = accounts[head];
            const mergedTokens = headAccount.tokens;
            const batch = [headAccount];
            while (mergedTokens.length * batch.length <= 1000 && head < trail) {
                const trailAccount = accounts[trail];
                mergedTokens.concat(trailAccount.tokens).filter((addr, pos, arr) => !!addr && arr.indexOf(addr) == pos);
                batch.push(trailAccount);
                trail--;
            }

            // remove null | duplicated address/tokens, add eth address
            mergedTokens.filter((addr, pos, arr) => !!addr && arr.indexOf(addr) == pos);
            mergedTokens.push(ethAddress);

            // push into batches array
            batches.push({
                accounts: batch,
                tokens: mergedTokens
            });

            // increase cursor
            head++;
        }

        // console.log(batches);

        await Promise.all(batches.map(async batch => {
            // extract addresses from accounts
            const addresses = batch.accounts.map(item => item.beneficiary);
            // log
            console.log(`\n[BalanceDaemon] Fetching Balances for ${accounts.length} total accounts, ${addresses.length} addresses and ${batch.tokens.length} Tokens`);

            const balances = await getAddressesBalances(addresses, batch.tokens);
            // console.log(balances);

            return Promise.all(batch.accounts.map(account => {
                const balancesForAddress = balances[account.beneficiary];
                return Promise.all(batch.tokens.map(async tokenAddr => {
                    let coin;
                    let version = null;

                    if (tokenAddr == ethAddress) {
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
                        if (!wallet && tokenAddr == ethAddress) {
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
