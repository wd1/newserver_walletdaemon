const axios = require('axios');
const url = require('url');
const {
    ETHSCAN_URI
} = require('./Config');

/**
 * @param {string} chain
 * @returns {string}
 */
function parseEtherscanURL() {
    let urlParse = url.parse(ETHSCAN_URI);
    return 'https://' + urlParse.host;
}

module.exports = function(chain, timeout) {
    const client = axios.create({
        baseURL: parseEtherscanURL(),
        timeout: timeout
    });

    /**
     * @param query
     * @returns {Promise<any>}
     */
    function getRequest(query) {
        return new Promise((resolve, reject) => {
            client.get('/api?' + query).then(response => {
                const data = response.data;

                if (data.status && data.status != 1) {
                    let returnMessage = 'NOTOK';
                    if (data.result && typeof data.result === 'string') {
                        returnMessage = data.result;
                    }
                    return reject(returnMessage);
                }

                if (data.error) {
                    let message = data.error;

                    if (typeof data.error === 'object' && data.error.message){
                        message = data.error.message;
                    }

                    return reject(new Error(message));
                }

                resolve(data);
            }).catch(error => {
                return reject(new Error(error));
            });
        });
    }

    return getRequest;
};
