import rp from 'request-promise';
import redisClient from '../redis';
import Coins from '../models/Coins';
import { cryptoIdToSymbolAll, CMC_API_URL, CMC_API_SECRET, CC_API_URL, CC_API_KEY } from '../services/Config';
import { cryptoIdToSymbol, CMC_API_URL, CMC_API_SECRET, CC_API_URL, CC_API_KEY, PRICE_API_URL } from '../services/Config';

export const fetchCoinPrices = async () => {
    console.log(`\n------------- Fetching Token Prices from CoinMarketCap ------------`);

    const requestOptions = {
        method: 'GET',
        uri: `${CMC_API_URL}/v1/cryptocurrency/listings/latest`,
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
        const response = await rp(requestOptions);
        if (!response.status.error_code) {
            await Promise.all(response.data.map(async coinItem => {

                let coin = await Coins.findOne({ symbol: coinItem.symbol }).exec();
                if (coin && coin.symbol !== "COIN") {
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
                } else if (coin && coin.symbol === "COIN") {
                    coin.set({
                        name: coinItem.name,
                        totalSupply: coinItem.total_supply,
                        circulatingSupply: coinItem.circulating_supply,
                        maxSupply: coinItem.max_supply,
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
    } catch (e) {
        console.log(`[CoinDaemon] Error updating coin quotes: ${e}`);
    }

    setTimeout(fetchCoinPrices, 3600000);
};

export const fetchPricesFromCryptoCompare = async () => {
    console.log(`\n------------- Fetching Supported Asset Prices from CryptoCompare ------------`);

    const cryptoIdToSymbols = await cryptoIdToSymbolAll();
    const symbols = cryptoIdToSymbols.map(crypto => crypto.symbol).filter(crypto => crypto.symbol !== 'COIN');
    const requestOptions = {
        method: 'GET',
        uri: `${CC_API_URL}/data/pricemulti`,
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
            if (symbol !== "COIN") {
                let coin = await Coins.findOne({symbol});
                if (!coin) {
                    coin = new Coins({
                        symbol
                    });
                }

                coin.price = response[symbol].USD;
                return coin.save();
            }
        }));
    } catch (e) {
        console.log(`[CoinDaemon] Error fetching coin prices from CryptoCompare: ${e}`);
    }

    setTimeout(fetchPricesFromCryptoCompare, 60000);
};

export const fetchCoinPrice = async () => {
    console.log(`\n------------- Fetching COIN Price From Coinvest Price API ------------`);

    try {
        const coin = await Coins.findOne({ symbol: 'COIN' }).exec();
        if (coin) {
            const requestOptions = {
                method: 'GET',
                uri: PRICE_API_URL,
                qs: {
                    cryptos: coin.symbol
                },
                json: true,
                gzip: true
            };

            const response = await rp(requestOptions);

            coin.price = response[coin.symbol].USD;
            coin.marketCap = coin.price * coin.circulatingSupply;
            console.log(coin.price);
            coin.save(err => {
                if (err) {
                    console.log('[CoinDaemon] Error fetching coin prices from Coinvest API - save: ', err);
                }
            });
        }
    } catch (e) {
        console.log('[CoinDaemon]: ', e);
    }

    setTimeout(fetchCoinPrice, 30000);
};
