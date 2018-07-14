const request = require('request');
const schedule = require('node-schedule');

const Coins = require('../models/Coins');
const { cryptoIdToSymbol } = require('../services/Config');

let updateAsset, updateCoinPrices;

exports.coinSchedule = () => {
    updateAsset = schedule.scheduleJob('*/1 * * * *', getAssets);
    updateCoinPrices = schedule.scheduleJob('*/1 * * * *', getPricesFromCryptoCompare);
};

exports.cancelAssetSchedule = () => {
    if (updateAsset) {
        updateAsset.cancel();
    }
};

exports.cancelPriceSchedule = () => {
    if (updateCoinPrices) {
        updateCoinPrices.cancel();
    }
};

const getAssets = () => {
    try {
        Coins.findOne({ symbol: 'COIN' }, (err, coin) => {
            if (err) {
                console.log('getAssets: findOne: ', err);
                return;
            }

            if (!coin) {
                coin = new Coins({
                    name: 'Coinvest COIN V2 Token',
                    symbol: 'COIN',
                    price: 1,
                    limit: 18
                });
            }

            coin.save(err => {
                if (err) {
                    console.log('getAssets: save: ', err);
                }
            });
        });

        request('https://api.coinmarketcap.com/v2/listings', (err, response) => {
            if (err) {
                console.log('getAssets: coinmarketcap-listings: ', err);
                return;
            }

            if (response.statusCode === 200) {
                const body = JSON.parse(response.body);

                if (body.metadata.num_cryptocurrencies) {
                    const limit = Math.floor(body.metadata.num_cryptocurrencies / 100);

                    for (let i = 0; i <= limit; i++) {
                        let url = 'https://api.coinmarketcap.com/v2/ticker/?structure=array';
                        if (i !== 0) {
                            url += '&start=' + (i * 100 + 1);
                        }

                        request(url, (err, response) => {
                            if (err) {
                                console.log('getAssets: coinmarketcap-ticker: ', err);
                                return;
                            }

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
                                            }

                                            coin.save(err => {
                                                if (err) {
                                                    console.log('getAssets: save: ', err);
                                                }
                                            });
                                        });
                                    });
                                }
                            }
                        });
                    }

                    getCryptoCompareId();
                    // ToDo: Add functionality for our COIN token

                    console.log('Coins updated successfully.');
                }
            }
        });
    } catch (err) {
        console.log('getAssets: catch: ', err);
    }
};

const getCryptoCompareId = () => {
    Coins.find((err, coins) => {
        if (err) {
            console.log('getCryptoCompareId: find: ', err);
            return;
        }

        let array = [];
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
                        if (body['Data'][coin.symbol]) {
                            coin.cryptoCompareId = body['Data'][coin.symbol]['Id'];
                            coin.image = body['Data'][coin.symbol]['ImageUrl'];

                            coin.save(err => {
                                if (err) {
                                    console.log('getCryptoCompareId: save: ', err);
                                }
                            });
                        }
                    });
                } catch (err) {
                    console.log('getCryptoCompareId: catch: ', err);
                }

                console.log('Updated coins cryptoCompareId successfully.');

                // getCreatedAt();
            });
        } else {
            // getCreatedAt();
        }
    });
};

const getCreatedAt = () => {
    try {
        Coins.find((err, coins) => {
            if (err) {
                console.log('getCreatedAt: find: ', err);
                return;
            }

            coins.forEach(coin => {
                if (coin.cryptoCompareId && !coin.created) {
                    request('https://www.cryptocompare.com/api/data/coinsnapshotfullbyid?id=' + coin.cryptoCompareId, (err, response) => {
                        if (err) {
                            console.log('getCryptoCompareId: cryptocompare: ', err);
                            return;
                        }

                        const body = JSON.parse(response.body);

                        coin.created = body['Data']['General']['StartDate'];
                        coin.save(err => {
                            if (err) {
                                console.log('getCryptoCompareId: save: ', err);
                            }
                        });

                        console.log('Updated coins createdAt successfully.');
                    });
                }
            });
        });
    } catch (err) {
        console.log('getCreatedAt: catch: ', err);
    }
};

const getPricesFromCryptoCompare = async () => {
    let coins = [];
    let symbols = '';

    try {
        for (let i = 0; i < cryptoIdToSymbol.length; i++) {
            const coin = await Coins.findOne({ symbol: cryptoIdToSymbol[i].symbol }).exec();

            if (coin) {
                coins.push(coin);
                symbols += cryptoIdToSymbol[i].symbol + ',';
            }
        }
    } catch (err) {
        console.log('getPricesFromCryptoCompare: catch: ', err);
        return;
    }

    request('https://min-api.cryptocompare.com/data/pricemulti?tsyms=USD,EUR&fsyms=' + symbols, (err, response) => {
        if (err) {
            console.log('getPricesFromCryptoCompare: ', err);
            return;
        }

        try {
            const body = JSON.parse(response.body);
            coins.forEach(coin => {
                coin.price = body[coin.symbol]['USD'];
                coin.save(err => {
                    if (err) {
                        console.log('getPricesFromCryptoCompare: save: ', err);
                    }
                });
            });

            console.log('Updated coin prices successfully.');
        } catch (err) {
            console.log('getPricesFromCryptoCompare: catch: ', err);
        }
    });
};