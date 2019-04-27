import Web3 from 'web3';
import net from 'net';
import redisClient from '../redis';
import {GETH_IPC_PATH, GETH_SOCKET_URL, LAST_BLOCK, IPC_ENABLED, GETH_INFURA} from './Config';

let web3;

const web3Infura = !!GETH_INFURA ? new Web3(new Web3.providers.HttpProvider(GETH_INFURA)) : null;
const { logger } = require('../services/logger');

if (IPC_ENABLED) {
    const client = new net.Socket();
    web3 = new Web3(new Web3.providers.IpcProvider(GETH_IPC_PATH, client));
} else {
    let provider = new Web3.providers.WebsocketProvider(GETH_SOCKET_URL);
    web3 = new Web3(provider);

    provider.on('error', e => console.error('[GETH] WS Error: ', e));
    provider.on('end', e => {
        logger.log('error', { label: 'WebSocket', message: `WebSocket Disconnected: ${e}` });

        provider = new Web3.providers.WebsocketProvider(GETH_SOCKET_URL);
        provider.on('connect', () => {
            logger.log('info', { label: 'WebSocket', message: 'WebSocket Reconnected' });
        });
        web3.setProvider(provider);
    });
}

const processBlock = async (blockHashOrId, opts) => {
    try {
        const block = await web3.eth.getBlock(blockHashOrId, true);

        if (block) {
            opts.onTransactions ? opts.onTransactions(block, block.transactions) : null;
            opts.onBlock ? opts.onBlock(blockHashOrId) : null;
        } else {
            logger.log('info', { label: 'WebSocket', message: `Cannot fetch block: ${blockHashOrId}` });
        }

        return block;
    } catch (error) {
        logger.log('error', { label: 'WebSocket', message: `Error fetching blocks from Geth: ${error}` });

        return null;
    }
};

const syncToBlock = async (index, latest, opts) => {
    if (index >= latest) {
        return index;
    }

    await processBlock(index + 1, opts);
    return await syncToBlock(index + 1, latest, opts);
};

const syncBlocks = async (currentBlockNumber, opts) => {
    // @notice this is to use in case we need to traverse history blocks
    const latestBlockNumber = await web3.eth.getBlockNumber();
    const syncedBlockNumber = await syncToBlock(currentBlockNumber, latestBlockNumber, opts);

    // this subscribes new incoming blocks after old blocks are synced
    web3.eth.subscribe('newBlockHeaders', (error, result) => {
        logger.log('error', { label: 'WebSocket', message: `New block subscription error: ${error}` });
    })
        .on('data', async blockHeader => {
            return await processBlock(blockHeader.number, opts);
        });

    return syncedBlockNumber;
};

const updateBlockHead = async head => {
    return await redisClient.setAsync('eth:last-block', head.toString());
};

const startSyncingBlocks = async handleTransactions => {
    let lastBlockNumber = await redisClient.getAsync('eth:last-block');
    if (!lastBlockNumber || lastBlockNumber < LAST_BLOCK) {
        lastBlockNumber = LAST_BLOCK;
    }

    lastBlockNumber = parseInt(lastBlockNumber || 0, 10);
    syncBlocks(lastBlockNumber, {
        onBlock: (blockNumber) => {
            logger.log('info', { label: 'WebSocket', message: `BlockNumber: ${blockNumber}` });

            updateBlockHead(blockNumber);
        },
        onTransactions: handleTransactions
    });
};

export {
    web3,
    web3Infura,
    startSyncingBlocks
};
