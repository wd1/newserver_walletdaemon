const request = require('request');
const schedule = require('node-schedule');

const Coins = require('../models/Coins');
const { cryptoIdToSymbol } = require('../services/Config');

let updateAsset;
let updateCryptoCompareId;
let updateCoinPrices;

exports.coinSchedule = () => {
    updateAsset = schedule.scheduleJob('*/1 * * * *', getAssets);
    updateCryptoCompareId = schedule.scheduleJob('*/1 * * * *', getCryptoCompareId);
    updateCoinPrices = schedule.scheduleJob('*/1 * * * *', getPricesFromCryptoCompare);
};

exports.cancelAssetSchedule = () => {
    if (updateAsset) {
        updateAsset.cancel();
    }
};

exports.cancelCryptoCompareSchedule = () => {
    if (updateCryptoCompareId) {
        updateCryptoCompareId.cancel();
    }
};

exports.cancelPriceSchedule = () => {
    if (updateCoinPrices) {
        updateCoinPrices.cancel();
    }
};

const getAssets = () => {
    request('https://api.coinmarketcap.com/v2/listings', (err, response) => {
        if (err) {
            console.log('getAssets: coinmarketcap-listings: ', err);
            return;
        }

        try {
            if (response.statusCode === 200) {
                const body = JSON.parse(response.body);

                if (body.metadata.num_cryptocurrencies) {
                    const limit = Math.floor(body.metadata.num_cryptocurrencies / 100);

                    for (let i = 0; i <= limit; i++) {
                        let url = 'https://api.coinmarketcap.com/v2/ticker/?structure=array';
                        if (i !== 0) {
                            url += `&start=${i * 100 + 1}`;
                        }

                        request(url, (err, response) => {
                            if (err) {
                                console.log('getAssets: coinmarketcap-ticker: ', err);
                                return;
                            }

                            try {
                                if (response.statusCode === 200) {
                                    const res = JSON.parse(response.body);

                                    if (res.data) {
                                        res.data.forEach(dt => {
                                            Coins.findOne({ symbol: dt.symbol }, (err, coin) => {
                                                if (err) {
                                                    console.log('getAssets: findOne: ', err);
                                                    return;
                                                }

                                                if (coin) {
                                                    coin.set({
                                                        name: dt.name,
                                                        totalSupply: dt.total_supply,
                                                        circulatingSupply: dt.circulating_supply,
                                                        maxSupply: dt.max_supply,
                                                        price: dt.quotes.USD.price,
                                                        marketCap: dt.quotes.USD.market_cap,
                                                        volume24h: dt.quotes.USD.volume_24h,
                                                        percentageChange1h: dt.quotes.USD.percent_change_1h,
                                                        percentageChange24h: dt.quotes.USD.percent_change_24h,
                                                        percentageChange7d: dt.quotes.USD.percent_change_7d,
                                                        lastUpdated: dt.last_updated
                                                    });

                                                    coin.save(err => {
                                                        if (err) {
                                                            console.log('getAssets: save: ', err);
                                                        }
                                                    });
                                                } else {
                                                    Coins.findOne({ name: dt.name }, (err, co) => {
                                                        if (err) {
                                                            console.log('getAssets: Coins.findOne: ', err);
                                                            return;
                                                        }

                                                        if (co) {
                                                            co.set({
                                                                symbol: dt.symbol,
                                                                totalSupply: dt.total_supply,
                                                                circulatingSupply: dt.circulating_supply,
                                                                maxSupply: dt.max_supply,
                                                                price: dt.quotes.USD.price,
                                                                marketCap: dt.quotes.USD.market_cap,
                                                                volume24h: dt.quotes.USD.volume_24h,
                                                                percentageChange1h: dt.quotes.USD.percent_change_1h,
                                                                percentageChange24h: dt.quotes.USD.percent_change_24h,
                                                                percentageChange7d: dt.quotes.USD.percent_change_7d,
                                                                lastUpdated: dt.last_updated
                                                            });

                                                            co.save(err => {
                                                                if (err) {
                                                                    console.log('getAssets: co.save: ', err);
                                                                }
                                                            });
                                                        } else {
                                                            coin = new Coins({
                                                                name: dt.name,
                                                                symbol: dt.symbol,
                                                                totalSupply: dt.total_supply,
                                                                circulatingSupply: dt.circulating_supply,
                                                                maxSupply: dt.max_supply,
                                                                price: dt.quotes.USD.price,
                                                                marketCap: dt.quotes.USD.market_cap,
                                                                volume24h: dt.quotes.USD.volume_24h,
                                                                percentageChange1h: dt.quotes.USD.percent_change_1h,
                                                                percentageChange24h: dt.quotes.USD.percent_change_24h,
                                                                percentageChange7d: dt.quotes.USD.percent_change_7d,
                                                                limit: 18,
                                                                lastUpdated: dt.last_updated,
                                                                coinMarketCapId: dt.id
                                                            });

                                                            coin.save(err => {
                                                                if (err) {
                                                                    console.log('getAssets: coin.save: ', err);
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        });
                                    }
                                }
                            } catch (err) {
                                console.log('getAssets: ticker: ', err);
                            }
                        });
                    }
                }
            }
        } catch (err) {
            console.log('getAssets: listing: ', err);
        }
    });
};

const getCryptoCompareId = () => {
    Coins.find((err, coins) => {
        if (err) {
            console.log('getCryptoCompareId: find: ', err);
            return;
        }

        const array = [];
        coins.forEach(coin => {
            if (!coin.cryptoCompareId || !coin.image) {
                array.push(coin);
            }
        });

        if (array.length > 0) {
            request('https://min-api.cryptocompare.com/data/all/coinlist', (err, response) => {
                if (err) {
                    console.log('getCryptoCompareId: cryptocompare: ', err);
                    return;
                }

                try {
                    const body = JSON.parse(response.body);

                    array.forEach(coin => {
                        if (body.Data[coin.symbol]) {
                            coin.cryptoCompareId = body.Data[coin.symbol].Id;
                            coin.image = body.Data[coin.symbol].ImageUrl;

                            coin.save(err => {
                                if (err) {
                                    console.log('getCryptoCompareId: save: ', err);
                                }
                            });
                        }
                    });
                } catch (err) {
                    console.log('getCryptoCompareId: coinlist: ', err);
                }
            });
        }
    });
};

const getPricesFromCryptoCompare = () => {
    const coinSymbols = cryptoIdToSymbol.map(crypto => crypto.symbol);
    Coins.find({ symbol: coinSymbols }, (err, coins) => {
        if (err) {
            console.log('getPricesFromCryptoCompare Coins.find: ', err);
            return;
        }

        if (coins && coins.length > 0) {
            const symbols = coins.map(coin => coin.symbol).join(',');

            request(`https://min-api.cryptocompare.com/data/pricemulti?tsyms=USD,EUR&fsyms=${symbols}`, (err, response) => {
                if (err) {
                    console.log('getPricesFromCryptoCompare: ', err);
                    return;
                }

                try {
                    const body = JSON.parse(response.body);

                    coins.forEach(coin => {
                        coin.price = body[coin.symbol].USD;
                        coin.save(err => {
                            if (err) {
                                console.log('getPricesFromCryptoCompare: save: ', err);
                            }
                        });
                    });
                } catch (err) {
                    console.log('getPricesFromCryptoCompare: pricemulti: ', err);
                }
            });
        }
    });
};
