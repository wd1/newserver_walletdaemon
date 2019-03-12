const TradeCoins = require('../models/TradeCoins');

exports.getTradeCoins = async () => {
    try {
        const assets = [];

        const tradeCoins = await TradeCoins.find({ enabled: "true" }, 'symbolID symbol smallestUnitName limit enabled', { lean: true }).exec();

        if (tradeCoins && tradeCoins.length > 0) {
            for (let i = 0; i < tradeCoins.length; i++) {
                assets.push({
                    id: tradeCoins[i].symbolID,
                    symbol: tradeCoins[i].symbol,
                    smallestUnitName: tradeCoins[i].smallestUnitName,
                    limit: tradeCoins[i].limit
                });
            }
        }

        return assets;
    } catch (e) {
        console.log('getTradeCoins: ', e);
        return [];
    }
};

exports.getTradeCoinsAll = async () => {
    try {
        const assets = [];

        const tradeCoins = await TradeCoins.find({}, 'symbolID symbol smallestUnitName limit enabled', { lean: true }).exec();

        if (tradeCoins && tradeCoins.length > 0) {
            for (let i = 0; i < tradeCoins.length; i++) {
                assets.push({
                    id: tradeCoins[i].symbolID,
                    symbol: tradeCoins[i].symbol,
                    smallestUnitName: tradeCoins[i].smallestUnitName,
                    limit: tradeCoins[i].limit
                });
            }
        }

        return assets;
    } catch (e) {
        console.log('getTradeCoinsAll: ', e);
        return [];
    }
};