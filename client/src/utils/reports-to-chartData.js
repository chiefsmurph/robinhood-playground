import getTrend from './get-trend';

const colors = ['green', 'blue', 'violet', 'violet', 'violet', 'pink', 'black', 'orange', 'blue', 'green', 'maroon'];
// const colors = [
//     'orange',
//     'orange',
//     'orange',
//     'orange',
//     'orange',
//     'orange',
//     'orange',
//     'orange',
//     'orange',
//     'orange',
//     'orange',
//     'orange',
//     'orange'
// ]

const showAccountBalance = window.location.href.includes('balance');
console.log({ showAccountBalance });

const fields = {
    // dayReports
    'unrealized return': d => d.holdReturn.percentage,
    'realized return': d => d.sellReturn.percentage,
    'forPurchase PM avg trend %': d => d.forPurchasePM.avgTrend,
    'forPurchase PM weighted trend %': d => d.forPurchasePM.weightedTrend,
    'pick to execution %': d => d.pickToExecutionPerc,

    // balanceReports
    'account balance': (d, i, array) => {
        if (i === 0) return 0;
        if (!d.accountBalance || !array[0].accountBalance) return 0;
        return getTrend(d.accountBalance, array[0].accountBalance);
    },
    'alpaca balance': (d, i, array) => {
        const firstVal = array.find(b => b.alpacaBalance).alpacaBalance;
        return i === 0 ? 0 : getTrend(d.alpacaBalance || firstVal, firstVal, true);
    },
    'russell2000': (d, i, array) =>  i === 0 ? 0 : getTrend(d.indexPrices.russell2000, array[0].indexPrices.russell2000),
    'SP500': (d, i, array) =>  i === 0 ? 0 : getTrend(d.indexPrices.sp500, array[0].indexPrices.sp500),
    'nasdaq': (d, i, array) =>  i === 0 ? 0 : getTrend(d.indexPrices.nasdaq, array[0].indexPrices.nasdaq),
    'btc': (d, i, array) =>  i === 0 ? 0 : getTrend(d.indexPrices.btc, array[0].indexPrices.btc || 26884),

    'fillPerc': d => d.fillPerc
};

const getColor = field => colors[Object.keys(fields).findIndex(f => f === field)];

const process = fieldsToInclude => (dayReports, dataSlice = 0) => {
    const datasets = fieldsToInclude.map(key => ({
        label: key,
        fill: false,
        lineTension: key.includes('balance') ? 0 : 0,
        backgroundColor: 'rgba(75,192,192,0.1)',
        pointBorderColor: key.includes('balance')|| false ? 'black' : getColor(key),
        // pointBorderWidth: 10,
        borderColor: key === 'account balance' || false ? 'purple' : getColor(key),
        // borderCapStyle: 'butt',
        borderWidth: key === 'btc' ? 3 : 5,
        borderDashOffset: 0.0,
        borderJoinStyle: 'round',
        // pointBorderColor: key === 'account balance' ? 'black' : getColor(key),
        pointBackgroundColor: key.includes('balance') || false ? 'black' : getColor(key),
        // pointBorderWidth: key === 'account balance' || false ? 6 : 5,
        // pointHoverRadius: 5,
        // pointHoverBackgroundColor: getColor(key),
        // pointHoverBorderColor: 'black',
        // pointHoverBorderWidth: 2,
        pointRadius: 0,
        // pointHitRadius: 10,
        data: dayReports.map(fields[key]).slice(0 - dataSlice),
    }));
    // console.log(datasets, Object.keys(fields))
    return {
        labels: dayReports.map(day => day.date || new Date(day.time).toLocaleString()).slice(0 - dataSlice),
        datasets
    };
};

export default {
    balanceChart: (arg1, showBalance, arg2) => {
        console.log({
            arg1,
            showBalance,
            arg2,
        });
        const actualProcess = process([
            'alpaca balance',
            ...showBalance ? ['account balance'] : [],
            'russell2000', 'SP500', 'nasdaq',
            'btc'
        ]);
        return actualProcess(arg1, arg2);
    },
    unrealizedVsRealized: process(['unrealized return', 'realized return']),
    spyVsForPurchase: process(['forPurchase PM avg trend %', 'forPurchase PM weighted trend %']),
    pickToExecutionPerc: process(['pick to execution %']),
    fillPerc: process(['fillPerc'])
};