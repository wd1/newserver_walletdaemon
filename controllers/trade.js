import BigNumber from 'bignumber.js';

import Accounts from '../models/Accounts';
import Assets from '../models/Assets';
import Indexes from '../models/Indexes';
import Wallets from '../models/Wallets';
import Coins from '../models/Coins';
import Orders from '../models/Orders';
import Transactions from '../models/Transactions';
import Pending from '../models/Pending';
import IndexContains from '../models/IndexContains';
import Blocks from '../models/Blocks';

import { cryptoIdToSymbol } from '../services/Config';
import { hexToDec } from '../services/hex2dec';
import { web3, subscribeToTradeEvents } from '../services/web3Socket';

export const handleIncomingTradeEvents = async () => {
    subscribeToTradeEvents(async events => {
        const coins = await Coins.find({}, null, { lean: true }).exec();
        const openOrders = await Orders.find({ status: 'Open', 'receipt.transactionHash': { $ne: null } }).exec();
        const filledOrders = await Orders.find({ txId: {$ne: null} }, 'txId', {lean: true});
        const accounts = await Accounts.find({}, 'beneficiary', { lean: true }).exec();
        const assets = await Assets.find({}).exec();
        const indexes = await Indexes.find({}).exec();
        const idxContains = await IndexContains.find({}, null, { lean: true }).exec();

        if (openOrders && openOrders.length > 0) {
            await Promise.all(events.map(async event => {
                try {
                    let tradeType = 'asset';
                    const tradeAddress = `0x${event.topics[1].substring(26)}`;
                    const params = event.data.substring(2).match(/.{1,64}/g);
                    const filledOrder = filledOrders && filledOrders.length ? filledOrders.findIndex(order => order.txId === event.transactionHash) : -1;
                    const accountId = accounts.findIndex(account => account.beneficiary === tradeAddress) > -1
                        ? accounts[accounts.findIndex(account => account.beneficiary === tradeAddress)]._id
                        : null;
                    const cryptoIds = [];
                    const quantities = [];
                    const prices = [];

                    if (filledOrder === -1 && accountId) {
                        if (params.length > 3) {
                            const cryptoCount = parseInt(hexToDec(params[3]), 10);
                            if (cryptoCount > 1) {
                                tradeType = 'index';
                            }

                            for (let i = 4; i < 4 + cryptoCount; i++) {
                                cryptoIds.push(parseInt(hexToDec(params[i]), 10));
                            }

                            const quantityCount = parseInt(hexToDec(params[4 + cryptoCount]), 10);
                            for (let i = 5 + cryptoCount; i < 5 + cryptoCount + quantityCount; i++) {
                                quantities.push(web3.fromWei(hexToDec(params[i])));
                            }

                            const priceCount = parseInt(hexToDec(params[5 + cryptoCount + quantityCount]), 10);
                            for (let i = 6 + cryptoCount + quantityCount; i < 6 + cryptoCount + quantityCount + priceCount; i++) {
                                prices.push(web3.fromWei(hexToDec(params[i])));
                            }

                            if (tradeType === 'asset') {
                                const coinId = coins.findIndex(coin => coin.symbol === cryptoIdToSymbol[cryptoIds[0]].symbol)
                                    ? coins[coins.findIndex(coin => coin.symbol === cryptoIdToSymbol[cryptoIds[0]].symbol)]._id
                                    : null;

                                if (coinId) {


                                }
                            } else if (tradeType === 'index') {
                                // todo handle index orders
                            }
                        }
                    }

                } catch (error) {
                    console.log(`[TradeDaemon] Error handling Trade events: ${error}`);
                }
            }));
        }
    });
};
