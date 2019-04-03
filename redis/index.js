import { REDIS_CLIENT, REDIS_HOST, REDIS_PORT } from '../services/Config';

const util = require("util");
const redis = require("redis");
const redisCommands = require("redis-commands");
const dotenv = require("dotenv");

let redisClient;

dotenv.config();

const promisify = (obj, methods) => {
    methods.forEach((method) => {
        obj[method + 'Async'] = util.promisify(obj[method]);
    });
};

promisify(redis.RedisClient.prototype, redisCommands.list);
promisify(redis.Multi.prototype, ['exec', 'execAtomic']);

if (REDIS_CLIENT == "IP") {
    redisClient = redis.createClient({
        host: REDIS_HOST || '127.0.0.1',
        port: REDIS_PORT || 6379
    });
} else {
    redisClient = redis.createClient({
        scheme: 'unix',
        path:REDIS_HOST
    });
}

module.exports = redisClient;