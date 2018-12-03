import Web3 from 'web3';
import { GETH_SOCKET_URL, INVESTMENT_CONTRACT_ADDRESS, Abi } from './Config';

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
    return await syncToBlock(index + 1, latest, opts);
};

const syncBlocks = async (currentBlockNumber, opts) => {
    // @notice this is to use in case we need to traverse history blocks
    // const latestBlockNumber = await web3.eth.getBlockNumber();
    // const syncedBlockNumber = await syncToBlock(currentBlockNumber, latestBlockNumber, opts);

    web3.eth.subscribe('newBlockHeaders', (error, result) => error && console.log(error))
        .on('data', async blockHeader => {
            return await processBlock(blockHeader.number, opts);
        });

    // return syncedBlockNumber;
};

const startSyncingBlocks = async (handleTransactions) => {
    const lastBlockNumber = 0;
    syncBlocks(lastBlockNumber, {
        onBlock: (blockNumber) => {
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

/**
 * { address: '0x4e644D0f78B31f29D5C6Cb16e446962ACCF051f1',
  blockNumber: 4551079,
  transactionHash: '0x90dd4d414693c3876ee8c80481cf1acdd0cc7b4801b9f9bf60400a527f461ebe',
  transactionIndex: 1,
  blockHash: '0x75ddd593c2aa66431f823c83692ad2176b0589dd36663900497fd3ccb9d4f0bc',
  logIndex: 2,
  removed: false,
  id: 'log_cc2050a7',
  returnValues:
   Result {
     '0': '0x0000000000000000000000000000000000000000',
     '1': '0xD8c47d7f9691C83E1A92B813c49A2471695Ad1eb',
     '2': '100000000000000000000',
     from: '0x0000000000000000000000000000000000000000',
     to: '0xD8c47d7f9691C83E1A92B813c49A2471695Ad1eb',
     value: '100000000000000000000' },
  event: 'Transfer',
  signature: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  raw:
   { data: '0x0000000000000000000000000000000000000000000000056bc75e2d63100000',
     topics:
      [ '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x000000000000000000000000d8c47d7f9691c83e1a92b813c49a2471695ad1eb' ] } }
 */

export {
    web3,
    startSyncingBlocks,
    subscribeToTradeEvents
};
