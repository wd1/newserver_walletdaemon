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

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: '.env' });

/**
 * Create Express server.
 */
const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('error', err => {
    console.error(err);
    console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));

    process.exit();
});

/**
 * Express configuration.
 */
app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8000);
app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

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

import { coinSchedule } from './controllers/coin_bak';
import { walletSchedule } from './controllers/wallet_bak';
import { tradeSchedule } from './controllers/trade_bak';
import { syncTransactionTask, handleIncomingChainData } from './controllers/transaction';
import { fetchBalances } from './controllers/balance';
import { getAddressesBalances } from './services/balanceChecker';
import { fetchCoinPrices, fetchPricesFromCryptoCompare } from './controllers/coin';
import { handleIncomingTradeEvents } from './controllers/trade';

// coinSchedule();
// walletSchedule();
// tradeSchedule();
handleIncomingChainData();
// fetchBalances();
// getAddressesBalances(['0x7c4029e848b7854f8ac1466158e55873ae8cc562'], ['0x4a7b684d1a875183753f88d433008cfc16065be5']);
// fetchCoinPrices();
// syncTransactionTask();
// fetchPricesFromCryptoCompare();
// handleIncomingTradeEvents();

module.exports = app;
