const mongoose = require('mongoose');
const chalk = require('chalk');

exports.initializeDB = () => {
    /**
     * Connect to MongoDB.
     */
    mongoose.connect(process.env.MONGODB_URI);
    mongoose.connection.on('error', err => {
        console.error(err);
        console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));

        process.exit();
    });
};
