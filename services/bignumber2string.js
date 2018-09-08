exports.bignumberToString = (a) => {
    let res = '';
    for (let prop in a.c) {
        if (a.c[prop]) {
            let str = String(a.c[prop]);
            if (prop !== '0' && str.length < 14) {
                let zeroArray = new Array(14 - str.length);
                zeroArray.fill(0);
                str = zeroArray.toString().replace(/,/g, '') + str;
            }

            res = res + str;
        }
    }

    if (res.length > a.e + 1) {
        res = res.substr(0, a.e + 1) + '.' + res.substr(a.e + 1);
    }

    if (a.s === -1) {
        res = '-' + res;
    }

    return res;
};