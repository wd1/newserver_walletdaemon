const querystring = require('querystring');

module.exports = function (getRequest, apiKey) {
    return {
        /**
        * Get a list of "ERC20 - Token Transfer Events" by Address
        * @param {string} address - Account address
        * @param {string} startblock - start looking here
        * @param {string} endblock - end looking there
        * @param {string} sort - Sort asc/desc
        * @param {string} contractaddress - Address of ERC20 token contract (if not specified lists transfers for all tokens)
        * @example
        * var txlist = api.account.tokentx('0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae', '0x5F988D968cb76c34C87e6924Cc1Ef1dCd4dE75da', 1, 'latest', 'asc');
        * @returns {Promise.<object>}
        */
        tokentx(address, contractaddress, startblock, endblock, sort) {
            const module = 'account';
            const action = 'tokentx';

            if (!startblock) {
                startblock = 0;
            }

            if (!endblock) {
                endblock = 'latest';
            }

            if (!sort) {
                sort = 'asc';
            }

            const queryObject = {
                module, action, startblock, endblock, sort, address, apiKey
            };

            if (contractaddress) {
                queryObject.contractaddress = contractaddress;
            }

            return getRequest(querystring.stringify(queryObject));
        },

        txlist(address, startblock = 0, endblock = 'latest', sort = 'asc') {
          const module = 'account';
          const action = 'txlist';

          const queryObject = {
            module, action, startblock, endblock, sort, address, apiKey
          };

          return getRequest(querystring.stringify(queryObject));
        },

        tokenbalance(address, contractaddress) {
            const module = 'account';
            const action = 'tokenbalance';
            const queryObject = {
              module, action, address, apiKey
            };

            if (contractaddress) {
              queryObject.contractaddress = contractaddress;
            }

            return getRequest(querystring.stringify(queryObject));
        },
    };
};
