import mongoose from './mongoose';
import { handleIncomingChainData } from '../controllers/transaction';

mongoose.connect();
handleIncomingChainData();
