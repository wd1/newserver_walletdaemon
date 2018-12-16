import rp from 'request-promise';
import redisClient from '../redis';
import Coins from '../models/Coins';
import { cryptoIdToSymbol, CMC_API_SECRET, CC_API_KEY } from '../services/Config';

export const fetchCoinPrices = async () => {
    console.log(`------------- Fetching Token Prices from CoinMarketCap ------------`);

    const requestOptions = {
        method: 'GET',
        uri: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
        qs: {
            start: 1,
            limit: 5000,
            convert: 'USD'
        },
        headers: {
            'X-CMC_PRO_API_KEY': CMC_API_SECRET
        },
        json: true,
        gzip: true
    };

    try {
        rp(requestOptions).then(async response => {
            if (!response.status.error_code) {
                await Promise.all(response.data.map(async coinItem => {
                    let coin = await Coins.findOne({ symbol: coinItem.symbol }).exec();
                    if (coin) {
                        coin.set({
                            name: coinItem.name,
                            totalSupply: coinItem.total_supply,
                            circulatingSupply: coinItem.circulating_supply,
                            maxSupply: coinItem.max_supply,
                            price: coinItem.quote.USD.price,
                            marketCap: coinItem.quote.USD.market_cap,
                            volume24h: coinItem.quote.USD.volume_24h,
                            percentageChange1h: coinItem.quote.USD.percent_change_1h,
                            percentageChange24h: coinItem.quote.USD.percent_change_24h,
                            percentageChange7d: coinItem.quote.USD.percent_change_7d,
                            lastUpdated: coinItem.last_updated,
                            created: coinItem.date_added
                        });
                    } else {
                        coin = new Coins({
                            name: coinItem.name,
                            symbol: coinItem.symbol,
                            totalSupply: coinItem.total_supply,
                            circulatingSupply: coinItem.circulating_supply,
                            maxSupply: coinItem.max_supply,
                            price: coinItem.quote.USD.price,
                            marketCap: coinItem.quote.USD.market_cap,
                            volume24h: coinItem.quote.USD.volume_24h,
                            percentageChange1h: coinItem.quote.USD.percent_change_1h,
                            percentageChange24h: coinItem.quote.USD.percent_change_24h,
                            percentageChange7d: coinItem.quote.USD.percent_change_7d,
                            lastUpdated: coinItem.last_updated,
                            created: coinItem.date_added
                        });
                    }

                    return coin.save();
                }));
            }
        });
    } catch (e) {
        console.log(`[CoinDaemon] Error updating coin quotes: ${e}`);
    }

    setTimeout(fetchCoinPrices, 10000);
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
        headers: {
            authorization: `Apikey ${CC_API_KEY}`
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
            console.log(coin);
            return coin.save();
        }));
    } catch (e) {
        console.log(`[CoinDaemon] Error fetching coin prices from CryptoCompare: ${e}`);
    }

    setTimeout(fetchPricesFromCryptoCompare, 5000);
};
