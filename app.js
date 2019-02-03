import express from 'express';
import chalk from 'chalk';
import errorHandler from 'errorhandler';
import dotenv from 'dotenv';
import { handleIncomingChainData } from './controllers/transaction';
import { fetchBalances } from './controllers/balance';
import { fetchCoinPrices, fetchPricesFromCryptoCompare, fetchCoinPrice } from './controllers/coin';
import { runPendingOrdersTask } from './controllers/order';

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

fetchCoinPrice();
fetchCoinPrices();
fetchPricesFromCryptoCompare();
fetchBalances();
handleIncomingChainData();
// runPendingOrdersTask();

module.exports = app;
