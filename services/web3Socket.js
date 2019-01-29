import Web3 from 'web3';
import redisClient from '../redis';
import { GETH_SOCKET_URL } from './Config';

let provider = new Web3.providers.WebsocketProvider(GETH_SOCKET_URL);

const web3 = new Web3(Web3.givenProvider || provider);
provider.on('error', e => console.error('[GETH] WS Error: ', e));
provider.on('end', e => {
    console.error('[GETH] WS Disconnected', e);
    console.error('[GETH] WS Reconnecting...');

    provider = new Web3.providers.WebsocketProvider(GETH_SOCKET_URL);
    provider.on('connect', () => {
        console.log('[GETH] WS Reconnected');
    });
    web3.setProvider(provider);
});

const processBlock = async (blockHashOrId, opts) => {
    try {
        const block = await web3.eth.getBlock(blockHashOrId, true);

        if (block) {
            opts.onTransactions ? opts.onTransactions(block, block.transactions) : null;
            opts.onBlock ? opts.onBlock(blockHashOrId) : null;
        } else {
            console.log(`Cannot fetch block: ${blockHashOrId}`);
        }

        return block;
    } catch (error) {
        console.log(`Error fetching blocks from Geth: ${error}`);
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
    web3.eth.subscribe('newBlockHeaders', (error, result) => error && console.log(error))
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
    lastBlockNumber = parseInt(lastBlockNumber || 0, 10);
    syncBlocks(lastBlockNumber, {
        onBlock: (blockNumber) => {
            console.log(`BlockNumber: ${blockNumber}`);
            updateBlockHead(blockNumber);
        },
        onTransactions: handleTransactions
    });
};

export {
    web3,
    startSyncingBlocks
};