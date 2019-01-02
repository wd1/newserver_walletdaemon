import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
// set mongoose Promise to Bluebird
mongoose.Promise = Promise;

// Exit application on error
mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err}`);
    process.exit(-1);
});

// print mongoose logs in dev env
if (process.env.NODE_ENV === 'development') {
    mongoose.set('debug', true);
}

/**
 * Connect to mongo db
 *
 * @returns {object} Mongoose connection
 * @public
 */
exports.connect = () => {
    mongoose.connect(process.env.MONGODB_URI, {
        keepAlive: 1,
        useMongoClient: true,
    });
    return mongoose.connection;
};
