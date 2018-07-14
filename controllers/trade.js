const schedule = require('node-schedule');

const Accounts = require('../models/Accounts');
const Wallets = require('../models/Wallets');
const Coins = require('../models/Coins');
const Orders = require('../models/Orders');
const Transactions = require('../models/Transactions');

const Web3Service = require('../services/Web3Service');
const { COINVEST_TOKEN_ADDRESS, ApiKey } = require('../services/Config');

let updateOrder;

exports.tradeSchedule = () => {
    updateOrder = schedule.scheduleJob('*/10 * * * *', runOrder);
};

exports.cancelTradeSchedule = () => {
    if (updateOrder) {
        updateOrder.cancel();
    }
};

const runOrder = () => {

};