// npm
const mapLimit = require('promise-map-limit');

// rh-actions
const getRisk = require('../rh-actions/get-risk');
const trendingUp = require('../rh-actions/trending-up');
const addOvernightJumpAndTSO = require('../app-actions/add-overnight-jump-and-tso');

const getTicks = arr => arr.map(buy => buy.ticker);
const trendFilter = async (trend) => {
    // stocks that went up overnight and
    // trending upward
    console.log('running based-on-jump strategy');

    let withOvernight = await addOvernightJumpAndTSO(trend);
    // withOvernight = withOvernight.filter(buy => buy.fundamentals.volume > 1000);

    const filterSortedTicks = async (filter, sort) => {
        const passedFirstFilter = withOvernight.filter(filter).sort(sort);
        const withRisk = await mapLimit(passedFirstFilter, 20, async buy => ({
            ...buy,
            ...(await getRisk(buy)),
            trending35257: await trendingUp(buy.ticker, [35, 25, 7]),
            trending607: await trendingUp(buy.ticker, [60, 7]),
            trending103: await trendingUp(buy.ticker, [10, 3]),
            trending53: await trendingUp(buy.ticker, [5, 3]),
        }));
        // console.log(withRisk);
        return (num, secondFilter) => {
            const ofInterest = secondFilter ? withRisk.filter(secondFilter) : withRisk;
            const sortedSliced = ofInterest.sort(sort).slice(0, num);
            return getTicks(sortedSliced);
        };
    };

    console.log('prepping up3overnight');
    const descendingOJ = (a, b) => b.overnightJump - a.overnightJump;
    const gtEightOvernight = await filterSortedTicks(
        buy => buy.overnightJump > 8,
        descendingOJ
    );
    const fourToEightOvernight = await filterSortedTicks(
        ({ overnightJump }) => overnightJump > 4 && overnightJump < 8,
        descendingOJ
    );
    const oneToFourOvernight = await filterSortedTicks(
        ({ overnightJump }) => overnightJump > 1 && overnightJump < 4,
        descendingOJ
    );
    console.log('prepping down3overnight');
    const ascendingOJ = (a, b) => a.overnightJump - b.overnightJump;
    const down3overnight = await filterSortedTicks(
        buy => buy.overnightJump < -3,
        ascendingOJ
    );
    const down5overnight = await filterSortedTicks(
        buy => buy.overnightJump < -5,
        ascendingOJ
    );
    const down8overnight = await filterSortedTicks(
        buy => buy.overnightJump < -8,
        ascendingOJ
    );
    // console.log('prepping highvolume');
    // const volumegt100kascendingjumps = await filterSortedTicks(
    //     buy => buy.fundamentals.volume > 100000,
    //     ascendingOJ
    // );
    // const volumegt100kdescendingjumps = await filterSortedTicks(
    //     buy => buy.fundamentals.volume > 100000,
    //     descendingOJ
    // );
    // const volumegt500kascendingjumps = await filterSortedTicks(
    //     buy => buy.fundamentals.volume > 500000,
    //     ascendingOJ
    // );
    // const volumegt500kdescendingjumps = await filterSortedTicks(
    //     buy => buy.fundamentals.volume > 500000,
    //     descendingOJ
    // );

    const specificPerms = (name) => {
        return [
            [name, buy => buy[name]],
            [`${name}-shouldWatchout`, buy => buy[name] && buy.shouldWatchout],
            [`${name}-notWatchout`, buy => buy[name] && !buy.shouldWatchout],
            [`${name}-notWatchout-ltneg50percmax`, buy => buy[name] && !buy.shouldWatchout && buy.percMax < -50],
            [`${name}-notWatchout-gtneg20percmax`, buy => buy[name] && !buy.shouldWatchout && buy.percMax > -20],
            [`${name}-gt100kvolume`, buy => buy[name] && buy.fundamentals.volume > 100000],
            [`${name}-gt500kvolume`, buy => buy[name] && buy.fundamentals.volume > 500000],
            [`${name}-gt1milvolume`, buy => buy[name] && buy.fundamentals.volume > 1000000],

        ];
    };

    const filterPerms = [
        ['shouldWatchout', buy => buy.shouldWatchout],
        ['notWatchout', buy => !buy.shouldWatchout],
        ['notWatchout-ltneg50percmax', buy => !buy.shouldWatchout && buy.percMax < -50],
        ['notWatchout-gtneg20percmax', buy => !buy.shouldWatchout && buy.percMax > -20],
        ['gt100kvolume', buy => buy.fundamentals.volume > 100000],
        ['gt500kvolume', buy => buy.fundamentals.volume > 500000],
        ['gt1milvolume', buy => buy.fundamentals.volume > 1000000],

        ...specificPerms('trending35257'),
        ...specificPerms('trending607'),
        ...specificPerms('trending103'),
        ...specificPerms('trending53'),
    ];

    const runPerms = (name, fn) => {
        return filterPerms.reduce((acc, [subFilterName, filter]) => {
            const first5 = fn(5, filter);
            return {
                ...acc,
                [`${name}-${subFilterName}`]: first5,
                [`${name}-${subFilterName}-first3`]: first5.slice(0, 3),
                [`${name}-${subFilterName}-first2`]: first5.slice(0, 2),
                [`${name}-${subFilterName}-first1`]: first5.slice(0, 1),
            };
        }, {});
    };

    return {
        ...runPerms('gtEightOvernight', gtEightOvernight),
        ...runPerms('fourToEightOvernight', fourToEightOvernight),
        ...runPerms('oneToFourOvernight', oneToFourOvernight),
        ...runPerms('down3overnight', down3overnight),
        ...runPerms('down5overnight', down5overnight),
        ...runPerms('down8overnight', down8overnight),

        // ...runPerms('volumegt100kascendingjumps', volumegt100kascendingjumps),
        // ...runPerms('volumegt100kdescendingjumps', volumegt100kdescendingjumps),
        // ...runPerms('volumegt100kascendingjumps', volumegt100kascendingjumps),
        // ...runPerms('volumegt500kdescendingjumps', volumegt500kdescendingjumps),

    };
};

// based on jump
const basedOnJump = {
    name: 'based-on-jump',
    trendFilter,
    // run: [0, 5, 16, 30],
};

module.exports = basedOnJump;
