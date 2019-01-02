import mongoose from './mongoose';
import { syncTransactionTask } from '../controllers/transaction';

mongoose.connect();
syncTransactionTask();
