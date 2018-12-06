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
    if (coins.length > batchSize) {
        for (let i = 0; i < coins.length / batchSize; i++) {
            batches.push(coins.slice(i * batchSize, (i + 1) * batchSize - 1));
        }
    } else {
        batches.push(coins);
    }

    try {
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            symbols = batch.map(coin => coin.symbol);
            symbols = symbols.join(',');
            requestOptions.qs = {symbol: symbols};

            setTimeout(() => {
                try {
                    rp(requestOptions).then(async response => {
                        if (!response.status.error_code) {
                            await Promise.all(Object.keys(response.data || {}).map(async symbol => {
                                const coin = await Coins.findOne({symbol});
                                if (coin) {
                                    coin.set({
                                        price: response.data[symbol].quote.USD.price
                                    });

                                    return coin.save();
                                }
                            }));
                        }
                    });
                } catch (e) {
                    console.log(`[CoinDaemon] Error fetching coin quotes from CoinMarketCap: ${e}`);
                }
            }, 3000 * i);   // wait for 3s for each request due to rate limit (30 rpm)
        }
    } catch (e) {
        console.log(`[CoinDaemon] Error updating coin quotes: ${e}`);
    }

    setTimeout(fetchCoinPrices, 3000);
};

export const fetchPricesFromCryptoCompare = async () => {
    console.log(`------------- Fetching Supported Asset Prices from CryptoCompare ------------`);

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

    setTimeout(fetchPricesFromCryptoCompare, 5000);
};
