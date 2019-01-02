import mongoose from './mongoose';
import { fetchBalances } from '../controllers/balance';

mongoose.connect();
fetchBalances();
