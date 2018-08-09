exports.FAUCET_ADDRESS = '0x1a2c5f42f7ada1b44ddbcd9e192bf3460ce6d97b';
exports.INVESTMENT_CONTRACT_ADDRESS = '0x43483224e43fb5b5db9490c11273bdb73bfab619';
exports.COINVEST_TOKEN_ADDRESS = '0x31A24A6EFc66B919a6a6C36fe04e3FaD8D948db6';
exports.USER_DATA_ADDRESS = '0xd89ceebc821a8407f5de77a4edcaa970993cd1fe';

exports.FAUCET_DRIP_AMOUNT = 10000;
exports.DEMO_MASTER_ADDRESS = '0x1dece1fe19ddac7ae715b78baacf1597554a8d41';
exports.DEMO_MASTER_PASSPHRASE = 'a62b87e316c8e21910363fa23f0549e3';

exports.ApiKey = 'R9M28NJ1V1K9VGVW6531HCV5UFX5G8NRVG';

exports.Abi = [
    {
        "constant": false,
        "inputs": [
            {
                "name": "myid",
                "type": "bytes32"
            },
            {
                "name": "result",
                "type": "string"
            }
        ],
        "name": "__callback",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "myid",
                "type": "bytes32"
            },
            {
                "name": "result",
                "type": "string"
            },
            {
                "name": "proof",
                "type": "bytes"
            }
        ],
        "name": "__callback",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_beneficiary",
                "type": "address"
            },
            {
                "name": "_cryptoIds",
                "type": "uint256[]"
            },
            {
                "name": "_amounts",
                "type": "uint256[]"
            }
        ],
        "name": "buy",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_newAdmin",
                "type": "address"
            },
            {
                "name": "_approved",
                "type": "bool"
            }
        ],
        "name": "changeAdmin",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_newGasLimit",
                "type": "uint256"
            },
            {
                "name": "_newGasPrice",
                "type": "uint256"
            }
        ],
        "name": "changeGas",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_beneficiary",
                "type": "address"
            },
            {
                "name": "_cryptos",
                "type": "uint256[]"
            },
            {
                "name": "_amounts",
                "type": "uint256[]"
            },
            {
                "name": "_buy",
                "type": "bool"
            }
        ],
        "name": "getPrices",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "name": "description",
                "type": "string"
            }
        ],
        "name": "newOraclizeQuery",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "buyer",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "cryptoIds",
                "type": "uint256[]"
            },
            {
                "indexed": false,
                "name": "amounts",
                "type": "uint256[]"
            },
            {
                "indexed": false,
                "name": "prices",
                "type": "uint256[17]"
            }
        ],
        "name": "Buy",
        "type": "event"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_amount",
                "type": "uint256"
            },
            {
                "name": "_token",
                "type": "address"
            },
            {
                "name": "_data",
                "type": "bytes"
            }
        ],
        "name": "receiveApproval",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_beneficiary",
                "type": "address"
            },
            {
                "name": "_cryptoIds",
                "type": "uint256[]"
            },
            {
                "name": "_amounts",
                "type": "uint256[]"
            }
        ],
        "name": "sell",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "seller",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "cryptoIds",
                "type": "uint256[]"
            },
            {
                "indexed": false,
                "name": "amounts",
                "type": "uint256[]"
            },
            {
                "indexed": false,
                "name": "prices",
                "type": "uint256[17]"
            }
        ],
        "name": "Sell",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
    },
    {
        "inputs": [
            {
                "name": "_token",
                "type": "address"
            },
            {
                "name": "_bank",
                "type": "address"
            },
            {
                "name": "_userData",
                "type": "address"
            }
        ],
        "payable": true,
        "stateMutability": "payable",
        "type": "constructor"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "name": "admins",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "bank",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "myid",
                "type": "bytes32"
            },
            {
                "name": "_cryptoValues",
                "type": "uint256[17]"
            }
        ],
        "name": "calculateValue",
        "outputs": [
            {
                "name": "value",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_cryptos",
                "type": "uint256[]"
            }
        ],
        "name": "craftUrl",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "customGasLimit",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "myid",
                "type": "bytes32"
            },
            {
                "name": "_result",
                "type": "string"
            }
        ],
        "name": "decodePrices",
        "outputs": [
            {
                "name": "prices",
                "type": "uint256[17]"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "token",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "userData",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

exports.FaucetAbi = [
    {
        "constant": false,
        "inputs": [
            {
                "name": "_beneficiary",
                "type": "address"
            }
        ],
        "name": "disburse",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "token",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "constructor"
    }
];

exports.CoinvestTokenAbi = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_amount",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_sig",
                "type": "bytes"
            },
            {
                "name": "_function",
                "type": "bytes4"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            },
            {
                "name": "_extraData",
                "type": "bytes"
            },
            {
                "name": "_gasPrice",
                "type": "uint256"
            },
            {
                "name": "_nonce",
                "type": "uint256"
            }
        ],
        "name": "recoverPreSigned",
        "outputs": [
            {
                "name": "recovered",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_signature",
                "type": "bytes"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            },
            {
                "name": "_gasPrice",
                "type": "uint256"
            },
            {
                "name": "_nonce",
                "type": "uint256"
            }
        ],
        "name": "transferPreSigned",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_amount",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "getNonce",
        "outputs": [
            {
                "name": "nonce",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "name": "admins",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_signature",
                "type": "bytes"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            },
            {
                "name": "_gasPrice",
                "type": "uint256"
            },
            {
                "name": "_nonce",
                "type": "uint256"
            }
        ],
        "name": "approvePreSigned",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_amount",
                "type": "uint256"
            }
        ],
        "name": "decreaseApproval",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_signature",
                "type": "bytes"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            },
            {
                "name": "_gasPrice",
                "type": "uint256"
            },
            {
                "name": "_nonce",
                "type": "uint256"
            }
        ],
        "name": "decreaseApprovalPreSigned",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "",
                "type": "bytes4"
            }
        ],
        "name": "standardSigs",
        "outputs": [
            {
                "name": "",
                "type": "bytes4"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_amount",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_function",
                "type": "bytes4"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            },
            {
                "name": "_extraData",
                "type": "bytes"
            },
            {
                "name": "_gasPrice",
                "type": "uint256"
            },
            {
                "name": "_nonce",
                "type": "uint256"
            }
        ],
        "name": "getPreSignedHash",
        "outputs": [
            {
                "name": "txHash",
                "type": "bytes32"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_signature",
                "type": "bytes"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            },
            {
                "name": "_gasPrice",
                "type": "uint256"
            },
            {
                "name": "_nonce",
                "type": "uint256"
            }
        ],
        "name": "increaseApprovalPreSigned",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_hash",
                "type": "bytes32"
            }
        ],
        "name": "getSignHash",
        "outputs": [
            {
                "name": "signHash",
                "type": "bytes32"
            }
        ],
        "payable": false,
        "stateMutability": "pure",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_standardSig",
                "type": "bytes4"
            },
            {
                "name": "_ourSig",
                "type": "bytes4"
            }
        ],
        "name": "updateStandard",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_signature",
                "type": "bytes"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            },
            {
                "name": "_extraData",
                "type": "bytes"
            },
            {
                "name": "_gasPrice",
                "type": "uint256"
            },
            {
                "name": "_nonce",
                "type": "uint256"
            }
        ],
        "name": "approveAndCallPreSigned",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_amount",
                "type": "uint256"
            },
            {
                "name": "_data",
                "type": "bytes"
            }
        ],
        "name": "approveAndCall",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_sigToRevoke",
                "type": "bytes"
            }
        ],
        "name": "revokeSignature",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_tokenContract",
                "type": "address"
            }
        ],
        "name": "token_escape",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "hash",
                "type": "bytes32"
            },
            {
                "name": "sig",
                "type": "bytes"
            }
        ],
        "name": "ecrecoverFromSig",
        "outputs": [
            {
                "name": "recoveredAddress",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "pure",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_sigToRevoke",
                "type": "bytes"
            },
            {
                "name": "_gasPrice",
                "type": "uint256"
            }
        ],
        "name": "getRevokeHash",
        "outputs": [
            {
                "name": "txHash",
                "type": "bytes32"
            }
        ],
        "payable": false,
        "stateMutability": "pure",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_amount",
                "type": "uint256"
            }
        ],
        "name": "increaseApproval",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_newAdmin",
                "type": "address"
            },
            {
                "name": "_approved",
                "type": "bool"
            }
        ],
        "name": "changeAdmin",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            },
            {
                "name": "_spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_signature",
                "type": "bytes"
            },
            {
                "name": "_sigToRevoke",
                "type": "bytes"
            },
            {
                "name": "_gasPrice",
                "type": "uint256"
            }
        ],
        "name": "recoverRevokeHash",
        "outputs": [
            {
                "name": "from",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "pure",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_signature",
                "type": "bytes"
            },
            {
                "name": "_sigToRevoke",
                "type": "bytes"
            },
            {
                "name": "_gasPrice",
                "type": "uint256"
            }
        ],
        "name": "revokeSignaturePreSigned",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "fallback"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "tokens",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "tokens",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "name": "_sig",
                "type": "bytes"
            },
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            }
        ],
        "name": "SignatureRedeemed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    }
];

exports.UserDataAbi = [
    {
        "constant": false,
        "inputs": [
            {
                "name": "_newAdmin",
                "type": "address"
            },
            {
                "name": "_approved",
                "type": "bool"
            }
        ],
        "name": "changeAdmin",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_newAddress",
                "type": "address"
            }
        ],
        "name": "changeInvestmentAddress",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_newCount",
                "type": "uint256"
            }
        ],
        "name": "modifyCryptoCount",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_beneficiary",
                "type": "address"
            },
            {
                "name": "_cryptoIds",
                "type": "uint256[]"
            },
            {
                "name": "_amounts",
                "type": "uint256[]"
            },
            {
                "name": "_buy",
                "type": "bool"
            }
        ],
        "name": "modifyHoldings",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "name": "_investmentAddress",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "name": "admins",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "cryptosCount",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "investmentAddress",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_beneficiary",
                "type": "address"
            }
        ],
        "name": "returnHoldings",
        "outputs": [
            {
                "name": "holdings",
                "type": "uint256[17]"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "",
                "type": "address"
            },
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "userHoldings",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

exports.cryptoIdToSymbol = [
    { symbol: 'COIN', smallestUnitName: 'wei', limit: 18 },
    { symbol: 'BTC', smallestUnitName: 'gwei', limit: 18 },
    { symbol: 'ETH', smallestUnitName: 'wei', limit: 18 },
    { symbol: 'XRP', smallestUnitName: 'szabo', limit: 18 },
    { symbol: 'LTC', smallestUnitName: 'gwei', limit: 18 },
    { symbol: 'DASH', smallestUnitName: 'gwei', limit: 18 },
    { symbol: 'BCH', smallestUnitName: 'mwei', limit: 18 },
    { symbol: 'XMR', smallestUnitName: 'mwei', limit: 18 },
    { symbol: 'XEM', smallestUnitName: 'szabo', limit: 18 },
    { symbol: 'EOS', smallestUnitName: 'wei', limit: 18 },
    // { symbol: 'IBTC', smallestUnitName: 'gwei', limit: 8 }
];