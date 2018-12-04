/**
 * Module dependencies.
 */
const express = require('express');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const dotenv = require('dotenv');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: '.env' });


const AppConfig = require('./config');
const Model = require('./models');


/**
 * Create Express server.
 */
const app = express();
Model.initializeDB();
AppConfig.initConfig(app);


/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
    // only use in development
    app.use(errorHandler());
}

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
    console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
    console.log('  Press CTRL-C to stop\n');
});

const { coinSchedule } = require('./controllers/coin');
// const { balanceSchedule } = require('./controllers/balance');
const { walletSchedule } = require('./controllers/wallet');
const { tradeSchedule } = require('./controllers/trade');

coinSchedule();
// balanceSchedule();
walletSchedule();
// tradeSchedule();

module.exports = app;
