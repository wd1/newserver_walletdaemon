const request = require('request');
const rp = require('request-promise');

const Coins = require('../models/Coins');
const { cryptoIdToSymbol } = require('../services/Config');

const cmcApiKey = process.env.CMC_API_KEY;
const ccApiKey = process.env.CC_API_KEY;

const getAssets = async () => {
    try {
        const requestOptions = {
            method: 'GET',
            uri: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
            qs: {
                start: 1,
                limit: 5000,
                convert: 'USD'
            },
            headers: {
                'X-CMC_PRO_API_KEY': cmcApiKey
            },
            json: true,
            gzip: true
        };

        const response = await rp(requestOptions);
        if (response.status.error_code === 0 && !response.status.error_message) {
            response.data.forEach(async dt => {
                let coin = await Coins.findOne({ symbol: dt.symbol }).exec();
                if (coin) {
                    coin.set({
                        name: dt.name,
                        totalSupply: dt.total_supply,
                        circulatingSupply: dt.circulating_supply,
                        maxSupply: dt.max_supply,
                        price: dt.quote.USD.price,
                        marketCap: dt.quote.USD.market_cap,
                        volume24h: dt.quote.USD.volume_24h,
                        percentageChange1h: dt.quote.USD.percent_change_1h,
                        percentageChange24h: dt.quote.USD.percent_change_24h,
                        percentageChange7d: dt.quote.USD.percent_change_7d,
                        lastUpdated: dt.last_updated,
                        created: dt.date_added
                    });
                } else {
                    coin = new Coins({
                        name: dt.name,
                        symbol: dt.symbol,
                        totalSupply: dt.total_supply,
                        circulatingSupply: dt.circulating_supply,
                        maxSupply: dt.max_supply,
                        price: dt.quote.USD.price,
                        marketCap: dt.quote.USD.market_cap,
                        volume24h: dt.quote.USD.volume_24h,
                        percentageChange1h: dt.quote.USD.percent_change_1h,
                        percentageChange24h: dt.quote.USD.percent_change_24h,
                        percentageChange7d: dt.quote.USD.percent_change_7d,
                        lastUpdated: dt.last_updated,
                        created: dt.date_added
                    });
                }

                coin.save(err => {
                    if (err) {
                        console.log('getAssets: coin.save: ', err);
                    }
                });
            });
        } else {
            console.log('getAssets: ', response.status.error_message);
        }
    } catch (e) {
        console.log('getAssets: ', e);
    }

    setTimeout(getAssets, 3600000);
};

const getCryptoCompareId = async () => {
    try {
        const coins = await Coins.find().exec();

        const array = [];
        coins.forEach(coin => {
            if (!coin.cryptoCompareId || !coin.image) {
                array.push(coin);
            }
        });

        if (array.length > 0) {
            const requestOptions = {
                method: 'GET',
                uri: 'https://min-api.cryptocompare.com/data/all/coinlist',
                headers: {
                    authorization: `Apikey ${ccApiKey}`
                },
                json: true,
                gzip: true
            };

            const response = await rp(requestOptions);

            array.forEach(coin => {
                if (response.Data[coin.symbol]) {
                    coin.cryptoCompareId = response.Data[coin.symbol].Id;
                    coin.image = response.Data[coin.symbol].ImageUrl;

                    coin.save(err => {
                        if (err) {
                            console.log('getCryptoCompareId: save: ', err);
                        }
                    });
                }
            });
        }
    } catch (e) {
        console.log('getCryptoCompareId: ', e);
    }

    setTimeout(getCryptoCompareId, 60000);
};

const getPricesFromCryptoCompare = async () => {
    try {
        const coinSymbols = cryptoIdToSymbol.filter(crypto => crypto.symbol !== 'COIN').map(crypto => crypto.symbol);

        const coins = await Coins.find({ symbol: coinSymbols }).exec();
        if (coins && coins.length > 0) {
            const symbols = coins.map(coin => coin.symbol).join(',');

            const requestOptions = {
                method: 'GET',
                uri: 'https://min-api.cryptocompare.com/data/pricemulti',
                qs: {
                    fsyms: symbols,
                    tsyms: 'USD'
                },
                headers: {
                    authorization: `Apikey ${ccApiKey}`
                },
                json: true,
                gzip: true
            };

            const response = await rp(requestOptions);

            coins.forEach(coin => {
                coin.price = response[coin.symbol].USD;
                coin.save(err => {
                    if (err) {
                        console.log('getPricesFromCryptoCompare - save: ', err);
                    }
                });
            });
        }
    } catch (e) {
        console.log('getPricesFromCryptoCompare: ', e);
    }

    setTimeout(getPricesFromCryptoCompare, 60000);
};

const getCOINPrice = async () => {
    try {
        const coin = await Coins.findOne({ symbol: 'COIN' }).exec();
        if (coin) {
            const requestOptions = {
                method: 'GET',
                uri: 'http://ec2-18-234-124-53.compute-1.amazonaws.com/api/priceApi',
                qs: {
                    cryptos: coin.symbol
                },
                json: true,
                gzip: true
            };

            const response = await rp(requestOptions);

            coin.price = response[coin.symbol].USD;
            coin.save(err => {
                if (err) {
                    console.log('getCOINPrice - save: ', err);
                }
            });
        }
    } catch (e) {
        console.log('getCOINPrice: ', e);
    }

    setTimeout(getCOINPrice, 60000);
};

exports.coinSchedule = () => {
    getAssets();
    getCryptoCompareId();
    getPricesFromCryptoCompare();
    getCOINPrice();
};
