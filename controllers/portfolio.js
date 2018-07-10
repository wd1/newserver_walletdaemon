const schedule = require('node-schedule');
const BigNumber = require('bignumber.js');

const Accounts = require('../models/Accounts');
const Assets = require('../models/Assets');

const TruffleService = require('../services/TruffleService');

let updateAsset;

exports.portfolioSchedule = () => {
    // updateAsset = schedule.scheduleJob('*/1 * * * *', getVirtualAssets);
};

exports.cancelAssetSchedule = () => {
    if (updateAsset) {
        updateAsset.cancel();
    }
};

const getVirtualAssets = () => {
    try {
        Accounts.find((err, accounts) => {
            if (err) {
                console.log('getWallet: find: ', err);
                return;
            }

            accounts.forEach(account => {
                TruffleService.holdings(account.beneficiary)
                    .then(holdings => {
                        // const assetCounts = holdings.map(holding => (new BigNumber(holding)).toNumber());
                        console.log(holdings);
                    })
                    .catch(err => {
                        console.log('getAssets holdings: ', err);
                    });
            });
        });
    } catch (err) {
        console.log('getVirtualAssets: catch: ', err);
    }
};