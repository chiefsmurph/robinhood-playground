import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import InputRange from 'react-input-range';
import Ticker from 'react-ticker';
import * as Chart from 'chart.js';
import Odometer from 'react-odometerjs';
import * as ChartAnnotation from 'chartjs-plugin-annotation';

import './odometer.css';

import reportsToChartData from '../utils/reports-to-chartData';
import TrendPerc from '../components/TrendPerc';
import getTrend from '../utils/get-trend';
import _, { mapObject, throttle, flatten } from 'underscore';

function get(obj, path) {
    var nPath, remainingPath;
    if (!obj && !path) {
        return undefined;
    } else {
        var paths;

        if (!_.isEmpty(path.match(/^\[\d\]/))) {
            paths = path.replace(/^[\[\]]/g, '').split(/\./);
            nPath = _.first(paths[0].replace(/\]/, ''));
        } else {
            paths = path.split(/[\.\[]/);
            nPath = _.first(paths);
        }

        remainingPath = _.reduce(_.rest(paths), function(result, item) {
            if (!_.isEmpty(item)) {
                if (item.match(/^\d\]/)) {
                    item = "[" + item;
            }
                result.push(item);
            }

            return result;
        }, []).join('.');

        if (!obj) return undefined;

        if (_.isEmpty(remainingPath)) {
            return obj[nPath];
        } else {
            return _.has(obj, nPath) && get(obj[nPath], remainingPath);
        }
    }
}

console.log(
    get(
        {
            a: 1,
            b: { c: 3 }
        },
        'b.c'
    )
)

const easternTimezone = (() => {
    const est = new Date(new Date().toLocaleString("en-US", {timeZone: "America/New_York"}));
    const estOffset = est.getTime() - Date.now();
    console.log({ estOffset })
    return time => {
        return new Date(time);
        return new Date(new Date(time).getTime() + estOffset);
    };
})();

const isRegularHours = ({ time, isRegularHours }) => {
    return isRegularHours;
    // console.log({ time })
    const date = easternTimezone(time);
    
    const open = new Date(date.getTime());
    open.setHours(9);
    open.setMinutes(30);
    open.setMilliseconds(0);

    const close = new Date(date.getTime());
    close.setHours(16);
    close.setMinutes(0);
    close.setMilliseconds(0);

    return date.getTime() > open.getTime() && date.getTime() < close.getTime();
};

const getNewDayLines = chartData => {
    const allDates = chartData.labels;
    const lines = [];
    const getDate = date => (new Date(date)).toLocaleDateString();
    allDates.forEach((date, index, arr) => {
        const prev = arr[index - 1];
        if (prev && getDate(date) != getDate(prev)) {
            lines.push((new Date(date)).toLocaleString())
        }
    });
    return lines;
};

const getAfterHoursBoxes = balanceReports => {
    const boxes = [];
    let activeStart;
    balanceReports.forEach((report, index, arr) => {
        const prev = arr[index - 1];
        if (!isRegularHours(report) && (!prev || isRegularHours(prev))) {
            activeStart = (new Date(report.time)).toLocaleString();
        } else if (activeStart && isRegularHours(report) && !isRegularHours(prev)) {
            boxes.push([
                activeStart,
                (new Date(prev.time)).toLocaleString()
            ]);
            activeStart = null;
        }
    });
    if (activeStart) {
        boxes.push([
            activeStart,
            (new Date(balanceReports[balanceReports.length - 1].time)).toLocaleString()
        ])
    }
    return boxes;
};

const removeAfterHours = (chartData, afterHoursBoxes) => {
    const { datasets, labels } = chartData;
    const correspondingIndexes = afterHoursBoxes.map(([startDate, endDate]) => 
        [startDate, endDate].map(ahDate => labels.findIndex(labelDate => labelDate === ahDate))
    );
    correspondingIndexes.reverse().forEach(([startIndex, endIndex]) => {
        removeReports(chartData, startIndex, endIndex- startIndex);
        // chartData.labels.splice(startIndex, endIndex - startIndex);
        // datasets.forEach(dataset => {
        //     dataset.data.splice(startIndex, endIndex - startIndex);
        // });
    });
    console.log({correspondingIndexes})
    return chartData;
};

const removeReports = (chartData, startIndex, count) => {
    const { datasets, labels } = chartData;
    chartData.labels.splice(startIndex, count);
    datasets.forEach(dataset => {
        dataset.data.splice(startIndex, count);
    });
};

const annotateBoxes = boxes => boxes.map(([left, right], index) => ({
    type: 'box',

    // optional drawTime to control layering, overrides global drawTime setting
    drawTime: 'beforeDatasetsDraw',

    // optional annotation ID (must be unique)
    id: `a-box-${left}-${right}`,

    // ID of the X scale to bind onto
    xScaleID: 'x-axis-0',
    yScaleID: 'y-axis-0',

    // Left edge of the box. in units along the x axis
    xMin: left,

    // Right edge of the box
    xMax: right,

    // Top edge of the box in units along the y axis
    // yMax: 20,

    // Bottom edge of the box
    // yMin:  2,

    // Stroke color
    // borderColor: 'red',

    // Stroke width
    borderWidth: 0,

    // Fill color
    backgroundColor: '#e6e6e6',
}));


const annotateLines = boxes => boxes.map(date => ({
    type: 'line',

    // optional drawTime to control layering, overrides global drawTime setting
    drawTime: 'beforeDatasetsDraw',
    id: `a-line-${date}`,

    mode: 'vertical',
    scaleID: 'x-axis-0',
    value: date,

    // Top edge of the box in units along the y axis
    // yMax: 20,

    // Bottom edge of the box
    // yMin:  2,

    // Stroke color
    // borderColor: 'red',

    // Stroke width
    borderColor: 'black',
    borderWidth: 2,
    borderDash: [5, 10],
}));

const pruneByDays = (balanceReports, numDays) => {

    const response = [];
    let inc = 0;
    const pruneEvery = (numDays - 1) * 3 || 1;
    balanceReports.forEach((report, index) => {
        inc++;
        if (inc % pruneEvery === 0 || index === 0 || index === balanceReports.length - 1) {
            response.push(report);
        }
    })
    return response;

};


const smallDevice = window.innerWidth < 600;
class DayReports extends Component {
    constructor() {
        super();
        this.state = {
            timeFilter: 'onlyToday',
            numDaysToShow: 1,
            hoverIndex: null,
            afterHoursAnnotations: [],
            fuzzFactor: 2,
            showBalance: false,
            lowKey: true,
            onlyRegHrs: false
        };
    }
    componentDidMount() {
        // let caPlugin = ChartAnnotation;
        // caPlugin["id"]="annotation";
        // Chart.pluginService.register(caPlugin);
        const { balanceReports } = this.props;
        this.setState({
            afterHoursAnnotations: annotateBoxes(getAfterHoursBoxes(balanceReports))
        });
        const urlParams = new URLSearchParams(window.location.search);
        const numDays = urlParams.get('numDays');
        if (numDays && !isNaN(numDays)) {
            this.setState({
                numDaysToShow: Number(numDays)
            });
        }
    }
    componentDidMount() {
        this.setState({
            fuzzFactor: smallDevice && this.state.numDaysToShow === 1 ? 2 : 1
        })
    }
    setTimeFilter = timeFilter => this.setState({ timeFilter });
    render () {
        let { balanceReports, dayReports, admin, collections, lastCollectionRefresh, additionalAccountInfo: { cash, buyingPower, daytradeCount, maintenanceMargin }, setAppState, lowKey, showBalance, onlyRegHrs } = this.props;
        let { timeFilter, numDaysToShow, hoverIndex, fuzzFactor, afterHoursAnnotations,  } = this.state;
        if (!balanceReports || !balanceReports.length) return <b>LOADING</b>;

        console.log({
            lowKey,
            showBalance
        })

        // console.log({ balanceReports })

        balanceReports = balanceReports.filter(r => r.indexPrices);

        // filter balance reports
        const lastReport = balanceReports[balanceReports.length - 1];
        const d = new Date(lastReport.time);

        const allDates = [...new Set(balanceReports.map(report => (new Date(report.time)).toLocaleDateString()))];
        // const numDaysToShow = timeFilter === 'onlyToday' ? 1 : allDates.length;

        const startIndex = (() => {
            const startDate = allDates[allDates.length - numDaysToShow - 1];
            const first = !startDate ? 0 : balanceReports.length - balanceReports.slice().reverse().findIndex(report =>
                (new Date(report.time)).toLocaleDateString() === startDate && isRegularHours(report)
            ) - 1;
            // console.log({ allDates, startDate, lastRegularReport })
            return first;
        })();

        balanceReports = balanceReports.slice(startIndex);



        // stats!
        const getStats = prop => {
            const first = get(balanceReports[0], prop);
            let copy = [...balanceReports];
            if (onlyRegHrs) {
                copy = copy.filter(report => report.isRegularHours);
            }
            console.log({ copy})
            const compareIndex = hoverIndex ? hoverIndex : copy.length - 1;
            const compare = get(copy[compareIndex], prop);
            return {
                current: compare,
                absolute: compare - first,
                trend: getTrend(compare, first)
            };
        };

        const stats = mapObject({
            alpaca: 'alpacaBalance',
            ...showBalance && { robinhood: 'accountBalance' },
        }, getStats);

        console.log({ showBalance, stats })

        const indexStats = mapObject({
            nasdaq: 'indexPrices.nasdaq',
            russell2000: 'indexPrices.russell2000',
            sp500: 'indexPrices.sp500'
        }, getStats)



        // day pruning

        const numReports = balanceReports.length;
        let numDaysToPrune = smallDevice ? Math.ceil(numReports / 350) : numDaysToShow;
        balanceReports = pruneByDays(balanceReports, numDaysToPrune);
        balanceReports = pruneByDays(balanceReports, fuzzFactor);



        const numNotReg = balanceReports.findIndex(isRegularHours);
        
        // console.log({ numReports, smallDevice, numDaysToPrune, afterCount: balanceReports.length })

        // const numToShow = numDaysToShow === 1
        //     ? (() => {
        //         const index = balanceReports.slice().reverse().findIndex(r => 
        //             (new Date(r.time)).getDate() !== date
        //         );
        //         console.log({ index})
        //         firstOfDay = balanceReports[balanceReports.length - index];
        //         return balanceReports.length - index
        //     })() : 0;
        // balanceReports = balanceReports.slice(0 - dataSlice);

        // console.log({ lines: getNewDayLines(balanceReports)})   

        // more code!

        let firstOfDay;
        let chartData = (() => {
            // console.log({timeFilter})
            if (timeFilter === '2019') {
                return reportsToChartData.balanceChart(dayReports ? dayReports : []);
            }
            // nope not overall
            // data coming from balance reports
            
            const chartData = reportsToChartData.balanceChart(balanceReports, showBalance);
            return chartData;
            // const withDiff = {
            //     ...chartData,
            //     datasets: [
            //         {
            //             ...chartData.datasets[0],
            //             label: 'diff',
            //             data: chartData.datasets[0].data.map((val, i) => val - chartData.datasets[2].data[i]),
            //             borderWidth: 2,
            //             borderColor: 'pink',
            //         },
            //         ...chartData.datasets,
                    
            //     ]
            // };
            // return withDiff
        })();


        const mods = {
            // 1: [
            //     { label: "alpaca balance", mod: v => v + 4 - 0.5},
            //     { label: "russell2000", mod: v => v + 2 - 0.5 },
            //     { label: "nasdaq", mod: v => v - 1 },
            // ]
        };

        Object.keys(mods).forEach(day => {
            if (Number(day) === numDaysToShow) {
                mods[day].forEach(mod => {
                    const ind = chartData.datasets.findIndex(({ label }) => label === mod.label);
                    const cur = chartData.datasets[ind];
                    chartData.datasets[ind] = {
                        ...cur,
                        data: cur.data.map(v => mod.mod(v))
                    };
                });

            }
        });

        const CENTER_ON_OPEN = true;

        if (CENTER_ON_OPEN) {
            
        }
       

        console.log({ chartData})


        // console.log({ indexStats})
        const showingSince = firstOfDay ? firstOfDay : balanceReports[0];
        // console.log({ showingSince, firstOfDay, balanceReports })
        // const afterHoursBoxes = getAfterHoursBoxes(balanceReports);

        // console.log({
        //     same: afterHoursBoxes === [["10/4/2019, 3:00:15 PM","10/7/2019, 8:29:54 AM"],["10/7/2019, 3:00:15 PM","10/8/2019, 8:29:48 AM"],["10/8/2019, 3:00:04 PM","10/9/2019, 8:29:47 AM"],["10/9/2019, 3:00:16 PM","10/10/2019, 8:29:59 AM"]]
        // })

        // let afterHoursAnnotations = annotateBoxes(afterHoursBoxes);

        // const expected = [["10/2/2019, 5:00:01 AM","10/2/2019, 8:29:49 AM"],["10/2/2019, 3:00:08 PM","10/3/2019, 8:29:48 AM"],["10/3/2019, 3:00:13 PM","10/4/2019, 8:29:54 AM"],["10/4/2019, 3:00:15 PM","10/7/2019, 8:29:54 AM"],["10/7/2019, 3:00:15 PM","10/8/2019, 8:29:48 AM"],["10/8/2019, 3:00:04 PM","10/9/2019, 8:29:47 AM"],["10/9/2019, 3:00:16 PM","10/10/2019, 8:29:59 AM"]];
        // const newBox = JSON.stringify(afterHoursBoxes);
        // console.log({
        //     same: JSON.stringify(afterHoursAnnotations) === JSON.stringify(annotateBoxes(expected)),
        //     same2: JSON.stringify(afterHoursBoxes) === JSON.stringify(expected)
        // })
        // console.log({ afterHoursAnnotations, chartData })
        // console.log(getNewDayLines(balanceReports))
        // console.log('hi', (new Array(allDates.length)).map((_, i) => i))


        // last minute mods


        // deal with afterhours
        const afterHoursBoxes = getAfterHoursBoxes(balanceReports);
        console.log({ onlyRegHrs })
        if (onlyRegHrs) {
            removeAfterHours(chartData, afterHoursBoxes);
            if (!balanceReports[balanceReports.length - 1].isRegularHours) {
                removeReports(chartData, chartData.labels.length - 1, 1);
            }
        }
        removeReports(chartData, 0, 1);


        // tablet formatting

        const allDatas = chartData.datasets.map(dataset => dataset.data);
        const allValues = allDatas.reduce((acc, vals) => [...acc, ...vals], []);
        
        const min = Math.floor(_.min(allValues));
        const max = Math.ceil(_.max(allValues));
        

        const stepSize = Math.ceil((max - min) / 13);
        
        console.log({ d: chartData.datasets, allDatas, allValues,min,max, stepSize })

        return (
            <div style={{ height: '100%', padding: '1em' }}>
                {/* <Ticker speed={7}>
                    {
                        () => (
                            <div>
                                {
                                    Object.keys(collections).slice(10).reduce((acc, name) => [
                                        ...acc,
                                        `${name}: ${collections[name].join(', ')}`
                                    ], [' ', `updated: ${(new Date(lastCollectionRefresh)).toLocaleString()}`]).join(' ------------ ')
                                }
                            </div>
                        )
                    }
                </Ticker> */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between'}}>
                    <div style={{ paddingLeft: '0.5em' }}>
                        <div>
                            number of days to show... 
                            <select onChange={event => this.setState({ numDaysToShow: Number(event.target.value) })} value={numDaysToShow.toString()}>
                                {
                                    [...Array(allDates.length).keys()].map(i => ++i).map(num => (
                                        <option value={num}>{num}</option>
                                    ))
                                }
                            </select>
                            <br/>
                            <a href="#" onClick={() => this.setState({ numDaysToShow: 1 })}>[reset]</a>&nbsp;&nbsp;&nbsp;
                            <label>
                                <input type="checkbox" checked={showBalance} onClick={() => setAppState({ showBalance: !showBalance })} /> 
                                &nbsp;&nbsp;Show Balance
                            </label>
                            &nbsp;&nbsp;&nbsp;
                            <label>
                                <input type="checkbox" checked={lowKey} onClick={() => setAppState({ lowKey: !lowKey })} /> 
                                &nbsp;&nbsp;Lowkey
                            </label>
                            &nbsp;&nbsp;&nbsp;
                            <label>
                                <input type="checkbox" checked={onlyRegHrs} onClick={() => {
                                    setAppState({ onlyRegHrs: !onlyRegHrs })
                                }} /> 
                                &nbsp;&nbsp;Only Reg Hrs
                            </label>
                        </div>
                        

                        {/* <InputRange
                            maxValue={allDates.length}
                            minValue={1}
                            step={1}
                            // formatLabel={value => value.toFixed(2)}
                            value={this.state.numDaysToShow}
                            onChange={numDaysToShow => this.setState({ numDaysToShow })}
                            // onChange={value => console.log(value)} 
                        /> */}
                        {/* {
                            [
                                'onlyToday',
                                'ALL REPORTS',
                                ...admin ? ['2019'] : []
                            ].map(time => (
                                <div>
                                {
                                    (timeFilter === time)
                                        ? <span>{time}</span>
                                        : (
                                            <a href='#' onClick={() => this.setTimeFilter(time)}>{time}</a>
                                        )
                                }
                                </div>
                            ))
                        } */}
                    </div>
                    {
                        !lowKey && (
                            <div>
                                Cash: ${cash}<br/>
                                Buying Power: ${buyingPower}<br/>
                                Daytrade Count: {daytradeCount}<br/>
                                Maintanence Amt : ${maintenanceMargin}
                            </div>
                        )
                    }
                    <div style={{ paddingLeft: '5em' }}>
                        fuzz factor
                        <InputRange
                            maxValue={10}
                            minValue={1}
                            step={1}
                            // formatLabel={value => value.toFixed(2)}
                            value={this.state.fuzzFactor}
                            onChange={fuzzFactor => this.setState({ fuzzFactor })}
                            // onChange={value => console.log(value)} 
                        />
                        {/* {
                            [
                                'onlyToday',
                                'ALL REPORTS',
                                ...admin ? ['2019'] : []
                            ].map(time => (
                                <div>
                                {
                                    (timeFilter === time)
                                        ? <span>{time}</span>
                                        : (
                                            <a href='#' onClick={() => this.setTimeFilter(time)}>{time}</a>
                                        )
                                }
                                </div>
                            ))
                        } */}
                    </div>
                    <div style={{ display: lowKey ? 'none' : 'block' }}>
                        <Odometer 
                            value={stats.alpaca.current} 
                            format="(,ddd).dd"
                            duration={500}
                            />
                    </div>
                    <div style={{ fontSize: '80%', textAlign: 'right'  }}>
                        trend since {new Date((showingSince || {}).time).toLocaleString()}<br/>
                        {
                            Object.keys(stats).map(stat => (
                                <div>
                                    <span data-custom data-tooltip-str={`$${stats[stat].current}`}>
                                        {stat}
                                    </span>&nbsp;
                                    <b style={{ fontSize: '160%' }}>
                                        {
                                            lowKey
                                                ? (
                                                    <TrendPerc value={stats[stat].trend} />
                                                ) : (
                                                    <div>
                                                        <TrendPerc value={stats[stat].absolute} dollar={true}  />
                                                        (<TrendPerc value={stats[stat].trend} />)
                                                    </div>
                                                )
                                        }
                                        
                                    </b>
                                </div>
                            ))
                        }
                    </div>
                    <div style={{ fontSize: '86%', textAlign: 'center' }}>
                        <div style={{ border: '1px solid black', padding: '7px' }}>
                            <table style={{ marginRight: '0' }}>
                                {
                                    Object.keys(indexStats).map(stat => (
                                        <tr>
                                            <td>{stat}</td>
                                            <td>
                                                <TrendPerc value={indexStats[stat].trend} />
                                            </td>
                                        </tr>
                                    ))
                                }
                            </table>
                        </div>
                    </div>
                </div>
                <div style={{ height: '90%' }} className='wider-container'>
                    <Line 
                        data={chartData} 
                        plugins={[ChartAnnotation]}
                        options={{
                            events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
                            animation: !!timeFilter === '2019',
                            // onHover: (event, chartEls) => this.setState({ hoverIndex: get(chartEls[0], '_index') }),
                            // responsive: true,
                            maintainAspectRatio : false,
                            // plugins: {
                                annotation: {
                                    // enabled: true,
                                    annotations: smallDevice & numDaysToShow > 5 ? [] : [
                                        // {
                                        //     drawTime: "beforeDatasetsDraw",
                                        //     // id: "hline",
                                        //     type: "line",
                                        //     mode: "vertical",
                                        //     scaleID: "x-axis-0",
                                        //     value: '10/10/2019, 9:50:29 AM',
                                        //     borderColor: "#ccc",
                                        //     borderWidth: 10,
                                        //     label: {
                                        //         backgroundColor: "red",
                                        //         content: "Test Label",
                                        //         enabled: true
                                        //     }
                                        // },


                                        
                                        ...annotateBoxes(afterHoursBoxes),
                                        ...annotateLines(getNewDayLines(chartData)),

                                    ]
                                },
                            // }
                            scales: {
                                xAxes: [{
                                    // type: 'time',
                                    ticks: {
                                        autoSkip: true,
                                        maxTicksLimit: 20,
                                        display: true,
                                    },
                                    distribution: 'series',
                                }],
                                yAxes: [{
                                    display: true,
                                    ticks: {
                                        // beginAtZero: true,
                                        // steps: 10,
                                        stepSize,
                                        max,
                                        min
                                    }
                                }]
                            }
                            
                        }}
                    />
                </div>
            </div>
        )
    }
}

export default DayReports;