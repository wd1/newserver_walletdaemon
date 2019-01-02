import { web3 } from './web3Socket';
import { balanceCheckerAbi, BALANCE_CHECKER_ADDRESS } from './Config';

export const formatAddressBalances = (values, addresses, tokens) => {
    const balances = {};

    addresses.forEach((addr, addrIdx) => {
        balances[addr] = {};
        tokens.forEach((tokenAddr, tokenIdx) => {
            const balance = values[addrIdx * tokens.length + tokenIdx];
            if (balance) {
                balances[addr][tokenAddr] = balance.toString();
            }
        });
    });

    return balances;
};

export const getAddressBalances = async (address, tokens) => {
    const contract = new web3.eth.Contract(balanceCheckerAbi, BALANCE_CHECKER_ADDRESS);
    const balances = await contract.methods.balances([address], tokens).call();
    return formatAddressBalances(balances, [address], tokens)[address];
};

export const getAddressesBalances = async (addresses, tokens) => {
    const contract = new web3.eth.Contract(balanceCheckerAbi, BALANCE_CHECKER_ADDRESS);
    const balances = await contract.methods.balances(addresses, tokens).call();
    return formatAddressBalances(balances, addresses, tokens);
};
