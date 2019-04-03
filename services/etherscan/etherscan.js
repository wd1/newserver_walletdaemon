const account = require('./account');
const getRequest = require('../get-request');

/**
 * @module etherscan/api
 */

/**
 * @param {string} apiKey - (optional) Your Etherscan APIkey
 * @param {string} chain - (optional) Testnet chain keys [ropsten, rinkeby, kovan]
 * @param {number} timeout - (optional) Timeout in milliseconds for requests, default 10000
 */
module.exports = function (apiKey, chain, timeout) {

  if (!apiKey) {
    apiKey = 'YourApiKeyToken';
  }

  if (!timeout) {
    timeout = 10000;
  }

  /** @lends module:etherscan/api */
  return {
    /**
     * @namespace
     */
    account: account(getRequest(chain, timeout), apiKey)
  };
};