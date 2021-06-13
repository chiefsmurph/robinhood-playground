const dayOrder = [
    'next',
    'second',
    'third',
    'fourth'
];

const isBreakdownKey = string =>
    string.includes('-day') && dayOrder.some(day => string.startsWith(day));

const compareTwoBreakdowns = (a, b) => {
    const [aDay, _, aMinute] = a.split('-');
    const [bDay, __, bMinute] = b.split('-');
    if (aDay !== bDay) {
        return dayOrder.indexOf(aDay) > dayOrder.indexOf(bDay) ? 1 : -1;
    }
    return aMinute - bMinute;
};
const orderBreakdownKeys = keys => keys.sort(compareTwoBreakdowns);

module.exports = {
    dayOrder,
    isBreakdownKey,
    compareTwoBreakdowns,
    orderBreakdownKeys
};
