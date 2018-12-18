const _ = require('lodash');

const Accounts = require('../models/Accounts');
const Wallets = require('../models/Wallets');
const Coins = require('../models/Coins');
const { getAddressBalances } = require('../services/balanceChecker');

const fetchBalances = async () => {
    try {
        const coins = await Coins.find({}, 'symbol address', { lean: true }).exec();
        const coinEthIdx = coins.findIndex(coin => coin.symbol === 'ETH');

        const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
        const wallets = await Wallets.find({ coinId: { $ne: coins[coinEthIdx]._id } }).exec();

        const tokenAddresses = wallets.map(wallet => {
            const coin = _.find(coins, { _id: wallet.coinId });
            return coin ? coin.address : null;
        }).filter(addr => !!addr);
        tokenAddresses.push('0x0'); // add ether

        await Promise.all(accounts.map(async account => {
            const balances = await getAddressBalances(account.beneficiary, tokenAddresses);
            return Promise.all(Object.keys(balances).map(async tokenAddr => {
                const coinIdx = (tokenAddr === '0x0')
                    ? coins[coinEthIdx]._id
                    : coins.findIndex(coin => coin.address === tokenAddr);

                let wallet = await Wallets.findOne({ accountId: account._id, coinId: coinIdx }).exec();

                // if wallet isn't existed, create new for eth wallet, ignore for token wallet
                if (!wallet && tokenAddr === '0x0') {
                    wallet = new Wallets({
                        accountId: account._id,
                        coinId: coinIdx
                    });
                }

                if (wallet) {
                    wallet.amount = balances[tokenAddr];
                    wallet.latest = new Date().toUTCString();
                    return wallet.save();
                }
            }));
        }));
    } catch (error) {
        console.log(`[BalanceDaemon] Error fetching balances ${error}`);
    }

    setTimeout(fetchBalances, 15000);
};

exports.balanceSchedule = () => {
    fetchBalances();
};
