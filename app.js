import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import logger from 'morgan';
import chalk from 'chalk';
import errorHandler from 'errorhandler';
import lusca from 'lusca';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { syncTransactionTask, handleIncomingChainData } from './controllers/transaction';
import { fetchBalances } from './controllers/balance';
import { fetchCoinPrices, fetchPricesFromCryptoCompare } from './controllers/coin';
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


fetchCoinPrices();
fetchPricesFromCryptoCompare();
syncTransactionTask();
fetchBalances();
handleIncomingChainData();
// runPendingOrdersTask();

module.exports = app;
