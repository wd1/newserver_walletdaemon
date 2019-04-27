const mongoose = require('mongoose');
const chalk = require('chalk');
const { logger } = require('../services/logger');

exports.initializeDB = () => {
    /**
     * Connect to MongoDB.
     */
    // These options cause the following to fail on first attempt:
    // const order = await Orders.findOne({ status: 'Open', inputHash: hash, 'receipt.transactionHash': event.transactionHash }).exec();
    // mongoose.set('useNewUrlParser', true);
    // mongoose.set('useCreateIndex', true);
    mongoose.connect(process.env.MONGODB_URI);
    mongoose.connection.on('error', err => {
        logger.log('error', { label: 'MongoConnection', message: `MongoDB connection error. Please make sure MongoDB is running.: ${err}` });
        process.exit();
    });
};
