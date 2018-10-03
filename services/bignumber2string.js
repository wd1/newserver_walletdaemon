exports.bignumberToString = a => {
    let res = '';
    for (const prop in a.c) {
        if (a.c[prop]) {
            let str = String(a.c[prop]);
            if (prop !== '0' && str.length < 14) {
                const length = 14 - str.length;
                for (let i = 0; i < length; i++) {
                    str = `0${str}`;
                }
            }

            res += str;
        }
    }

    if (res.length > a.e + 1) {
        res = `${res.substr(0, a.e + 1)}.${res.substr(a.e + 1)}`;
    } else {
        const length = a.e + 1 - res.length;
        for (let i = 0; i < length; i++) {
            res += '0';
        }
    }

    if (a.s === -1) {
        res = `-${res}`;
    }

    return res;
};
