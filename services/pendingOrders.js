import mongoose from './mongoose';
import { runPendingOrdersTask } from '../controllers/order';

mongoose.connect();
runPendingOrdersTask();
