const util = require('util');
const redis = require('redis');
const redisCommands = require('redis-commands');
const dotenv = require('dotenv');

dotenv.config();

const promisify = (obj, methods) => {
    methods.forEach(method => {
        obj[`${method}Async`] = util.promisify(obj[method]);
    });
};

promisify(redis.RedisClient.prototype, redisCommands.list);
promisify(redis.Multi.prototype, ['exec', 'execAtomic']);

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379
});

module.exports = redisClient;
