import mongoose from './mongoose';
import { fetchCoinPrices, fetchPricesFromCryptoCompare } from '../controllers/coin';

mongoose.connect();
fetchCoinPrices();
fetchPricesFromCryptoCompare();
