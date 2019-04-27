import express from 'express';
import chalk from 'chalk';
import errorHandler from 'errorhandler';
import dotenv from 'dotenv';
import { unlockMasterAccount } from './services/Web3Service';
import { handleIncomingChainData } from './controllers/transaction';
import { fetchBalances, checkCoinBalances } from './controllers/balance';
import { fetchCoinPrices, fetchPricesFromCryptoCompare, fetchCoinPrice } from './controllers/coin';
import { scanPastTradeEvents } from './controllers/order';
import { logger, transports } from './services/logger';
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

    process.on('unhandledRejection', (reason, p) => {
        logger.log('error', 'Unhandled Rejection at: Promise', p, 'reason:', reason);

        // application specific logging, throwing an error, or other logic here
    });
}

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
    logger.log('info', 'App is running at http://localhost:%d in %s mode', app.get('port'), app.get('env'));
    logger.log('info', 'Press CTRL-C to stop');
});

/**
 * Unlock main GETH account
 */
unlockMasterAccount()
    .then(response => {
        // fetchCoinPrice();
        // fetchCoinPrices();
        // fetchPricesFromCryptoCompare();
        // fetchBalances();
        handleIncomingChainData();
        // scanPastTradeEvents();
        // checkCoinBalances();
    })
    .catch(err => {
        logger.log('error', { label: 'Web3Service', message: `Failed to unlock the master account.` });
    });


module.exports = app;
