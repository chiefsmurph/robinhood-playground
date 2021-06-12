const getTrend = (val1, val2) => {
    const changeAmt = Number(val1) - Number(val2);
    const trendPerc = changeAmt / Number(val2) * 100;
    return +(trendPerc.toFixed(2));
};

export default getTrend;
