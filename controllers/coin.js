import rp from 'request-promise';
import redisClient from '../redis';
import Coins from '../models/Coins';
import { cryptoIdToSymbol, CMC_API_SECRET } from '../services/Config';

export const fetchCoinPrices = async () => {
    console.log(`------------- Fetching Token Prices from CoinMarketCap ------------`);

    const batchSize = 30;
    const batches = [];
    let symbols = [];

    const requestOptions = {
        method: 'GET',
        uri: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
        headers: {
            'X-CMC_PRO_API_KEY': CMC_API_SECRET
        },
        json: true,
        gzip: true
    };

    const coins = await Coins.find({}, 'symbol', {lean: true});
    if (coins.length > 30) {
        for (let i = 0; i < coins.length / batchSize; i++) {
            batches.push(coins.slice(i * batchSize, (i + 1) * batchSize - 1));
        }
    } else {
        batches.push(coins);
    }

    try {
        await Promise.all(batches.map(async batch => {
            symbols = batch.map(coin => coin.symbol);
            symbols = symbols.join(',');
            requestOptions.qs = {symbol: symbols};

            try {
                setTimeout(async () => {
                    const response = await rp(requestOptions);
                    if (!response.status.error_code) {
                        return await Promise.all(Object.keys(response.data || {}).map(async symbol => {
                            const coin = await Coins.findOne({symbol});
                            if (coin) {
                                coin.set({
                                    price: response.data[symbol].quote.USD.price
                                });

                                return coin.save();
                            }
                        }));
                    }
                }, 30000);
            } catch (e) {
                console.log(`[CoinDaemon] Error fetching coin quotes from CoinMarketCap: ${e}`);
            }
        }));
    } catch (e) {
        console.log(`[CoinDaemon] Error updating coin quotes: ${e}`);
    }

    setTimeout(fetchCoinPrices, 30000);
};

export const fetchPricesFromCryptoCompare = async () => {
    console.log(`------------- Fetching Supported Token Prices from CryptoCompare ------------`);

    const symbols = cryptoIdToSymbol.map(crypto => crypto.symbol);
    const requestOptions = {
        method: 'GET',
        uri: 'https://min-api.cryptocompare.com/data/pricemulti',
        qs: {
            tsyms: 'USD,EUR',
            fsyms: symbols.join(',')
        },
        json: true,
        gzip: true
    };

    try {
        const response = await rp(requestOptions);
        await Promise.all(Object.keys(response).map(async symbol => {
            let coin = await Coins.findOne({symbol});
            if (!coin) {
                coin = new Coins({
                    symbol
                });
            }

            coin.price = response[symbol].USD;
            return coin.save();
        }));
    } catch (e) {
        console.log(`[CoinDaemon] Error fetching coin prices from CryptoCompare: ${e}`);
    }

    setTimeout(fetchPricesFromCryptoCompare, 10000);
};
