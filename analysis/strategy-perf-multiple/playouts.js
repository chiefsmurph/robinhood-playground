// take in a single array of trends (breakdown)
// and returns an object { hitFn: Boolean, value: Number }

const {
    avgArray,
    percUp,
    hundredResult
} = require('../../utils/array-math');

//

const createPlayout = (individualFn, arrFn) => ({
    type: arrFn ? 'arrFn' : 'individualFn',
    fn: breakdown => {
        if (arrFn) return { value: arrFn(breakdown) };
        for (let i = 0; i < breakdown.length; i++) {
            const b = breakdown[i];
            if (individualFn(b, i, breakdown)) {
                return {
                    hitFn: true,
                    value: b
                };
            }
        }
        return {
            hitFn: false,
            value: breakdown[breakdown.length - 1]
        };
    }
});



const limitPlayout = limit => createPlayout(v => Math.abs(v) > limit);
const limitDownUp = (down, up) => createPlayout(v =>
    v <= 0 - down || v >= up
);
const limitUp = limit => createPlayout(v => v >= limit);

const limitPerms = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
const downUpPerms = [
    [10, 5],
    [5, 10],
    [6, 4],
    [3, 6],
    [2, 5],
    [6, 12],
    [6, 3],
    [10, 3],
    [10, 1],
    [7, 3],
];
const upPerms = [1, 2, 3, 4, 5, 6];


const changeGtPerms = [1, 2, 3, 4, 5];
const changeGt = num => createPlayout((v, i, breakdowns) => {
    const prevBreakdown = breakdowns[i - 1];
    if (!prevBreakdown) return Math.abs(v) >= num;
    return Math.abs(v - prevBreakdown) >= num;
});

const playouts = {

    ...limitPerms.reduce((acc, limit) => ({
        ...acc,
        [`limit${limit}`]: limitPlayout(limit)
    }), {}),

    ...downUpPerms.reduce((acc, [down, up]) => ({
        ...acc,
        [`limit${down}Down${up}Up`]: limitDownUp(down, up)
    }), {}),

    ...upPerms.reduce((acc, up) => ({
        ...acc,
        [`limitUp${up}`]: limitUp(up)
    }), {}),

    firstGreen: limitUp(0.3),

    ...changeGtPerms.reduce((acc, num) => ({
        ...acc,
        [`changeGt${num}`]: changeGt(num)
    }), {}),

    alwaysLast: createPlayout(null, arr => arr[arr.length - 1]),
    onlyMax: createPlayout(null, arr => Math.max(...arr))
};

module.exports = playouts;
