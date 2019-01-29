const Web3 = require('web3');

const {
    GETH_SOCKET_URL,
    INVESTMENT_CONTRACT_ADDRESS,
    Abi
} = require('./Config');

const web3 = new Web3(Web3.givenProvider || GETH_SOCKET_URL);
const tradingContract = new web3.eth.Contract(Abi, INVESTMENT_CONTRACT_ADDRESS);

const processBlock = async (blockHashOrId, opts) => {
    const block = await web3.eth.getBlock(blockHashOrId, true);
    opts.onTransactions ? opts.onTransactions(block, block.transactions) : null;
    opts.onBlock ? opts.onBlock(blockHashOrId) : null;
    return block;
};

const syncToBlock = async (index, latest, opts) => {
    if (index > latest) {
        return index;
    }

    await processBlock(index + 1, opts);
    const result = await syncToBlock(index + 1, latest, opts);
    return result;
};

const syncBlocks = async (currentBlockNumber, opts) => {
    // @notice this is to use in case we need to traverse history blocks
    // const latestBlockNumber = await web3.eth.getBlockNumber();
    // const syncedBlockNumber = await syncToBlock(currentBlockNumber, latestBlockNumber, opts);

    web3.eth.subscribe('newBlockHeaders', (error, result) => error && console.log(error))
        .on('data', async blockHeader => {
            const block = await processBlock(blockHeader.number, opts);
            return block;
        });

    // return syncedBlockNumber;
};

const startSyncingBlocks = async handleTransactions => {
    const lastBlockNumber = 0;
    syncBlocks(lastBlockNumber, {
        onBlock: blockNumber => {
            console.log(`BlockNumber: ${blockNumber}`);
        },
        onTransactions: handleTransactions
    });
};

const subscribeToTradeEvents = handleTradeEvents => {
    tradingContract.events.allEvents({
        fromBlock: 0,
        topics: [
            '0x6a75660680cd3a8f7f34c5df6451086e3222c8a9e16e568b6e698098e8fd970b',
            '0x6a75660680cd3a8f7f34c5df6451086e3222c8a9e16e568b6e698098e8fd970b'
        ]
    }).on('data', handleTradeEvents).on('error', error => console.log(error));
};

export {
    web3,
    startSyncingBlocks,
    subscribeToTradeEvents
};
