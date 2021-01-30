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
import _, { mapObject, throttle, flatten, pick, isEqual } from 'underscore';

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


const easternTimezone = (() => {
    const est = new Date(new Date().toLocaleString("en-US", {timeZone: "America/New_York"}));
    const estOffset = est.getTime() - Date.now();
    // console.log({ estOffset })
    return time => {
        return new Date(new Date(time).getTime() + estOffset);
    };
})();

const oldSchoolRegularHours = time => {
    const date = easternTimezone(time);
    const open = new Date(date.getTime());
    open.setHours(9);
    open.setMinutes(30);
    open.setMilliseconds(0);

    const close = new Date(date.getTime());
    close.setHours(16);
    close.setMinutes(0);
    close.setMilliseconds(0);
    // console.log({
    //     date: date.toLocaleString(),
    //     open: open.toLocaleString(),
    //     close: close.toLocaleString()
    // })
    return date.getTime() > open.getTime() && date.getTime() < close.getTime();
};

const isRegularHours = ({ time, isRegularHours }) => {
    return isRegularHours !== undefined ? isRegularHours : oldSchoolRegularHours(time);
    // console.log({ time })
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


function getOutlierIndexes(someArray) {
    const outlierIndexes = [];
    someArray.forEach((value, index) => {
        const prev = someArray[index - 1];
        const next = someArray[index + 1];
        const bigJumpPrev = Math.abs(prev - value) > 5;
        const bigJumpNext = Math.abs(next - value) > 5;
        const prevNextNoRelated = Math.abs(prev - next) < 5;
        // if (value < -30) {
        //     console.log({
        //         bigJumpPrev,
        //         bigJumpNext,
        //         prevNextNoRelated,
        //         prev,
        //         next,
        //         trend: getTrend(prev, next)
        //     })
        // }
        if (bigJumpPrev && bigJumpNext && prevNextNoRelated) {
            console.log('outlier', value, index)
            outlierIndexes.push(index);
        }
    });
    return outlierIndexes;
}

const smallDevice = window.innerWidth < 600;
class DayReports extends Component {
    constructor() {
        super();
        this.state = {
            timeFilter: 'onlyToday',
            numDaysToShow: 2,
            hoverIndex: null,
            afterHoursAnnotations: [],
            fuzzFactor: 1,
            animateCount: null,
            intensiveData: null,
        };
    }
    componentDidMount() {
        console.log("mounted");

        // THIS SETS ONLYREGHRS BASED ON WHETHER IT IS CURRENTLY REG HRS
        // const currentlyRegularHours = oldSchoolRegularHours(Date.now());
        // console.log({ currentlyRegularHours });
        // this.props.setAppState({ onlyRegHrs: currentlyRegularHours })

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
        console.log('mounted');
        this.setIntensiveData();
        // setTimeout(() => this.startAnimation(), 10000);

        const fetchBTC = () => 
            this.props.socket.emit('client:getBTC', btcPrice => {
                this.setState({
                    btcPrice
                });
            });
        fetchBTC();
        this.setState({
            btcInterval: setInterval(fetchBTC, 15000)
        });
        
    }
    componentWillUnmount() {
        clearInterval(
            this.state.btcInterval
        )
    }
    startAnimation = () =>
        this.setState({
            animateCount: 0
        }, this.incrementAnimationCountAndScheduleTimeout);
    incrementAnimationCountAndScheduleTimeout = () => {
        const { animateCount } = this.state;
        if (this.state.intensiveData && animateCount > this.state.intensiveData.chartData.labels.length) {
            return;
        }
        this.setState(({
            animateCount: animateCount + 1
        }), () => {
            setTimeout(() => this.incrementAnimationCountAndScheduleTimeout(), 5);
        });
    };
    componentDidUpdate(prevProps, prevState) {
        const getMemoChunk = (props, state) => ({
            ...pick(props, ['balanceReports', 'lowKey', 'onlyRegHrs', 'hiddenFields', 'authLevel']),
            ...pick(state, ['numDaysToShow', 'hoverIndex', 'fuzzFactor'])
        });
        const needsToRecalcIntensiveData = !this.state.intensiveData || !isEqual(
            getMemoChunk(prevProps, prevState),
            getMemoChunk(this.props, this.state)
        );
        console.log({ 
            needsToRecalcIntensiveData, 
            prev: getMemoChunk(prevProps, prevState), 
            now: getMemoChunk(this.props, this.state) 
        });
        if (needsToRecalcIntensiveData) {
            this.setIntensiveData();
        }
    }
    setIntensiveData = () => {
        const {
            numDaysToShow,
            hoverIndex,
            fuzzFactor, 
            keyData,
        } = this.state;

        const {
            balanceReports,
            lowKey, 
            onlyRegHrs,
            hiddenFields,
            authLevel
        } = this.props;

        let intensiveReports = [...balanceReports];

        console.log('recalcing intensive data', {
            ...{
                numDaysToShow,
                hoverIndex,
                fuzzFactor, 
            },
            ...{
                intensiveReports,
                lowKey,
                onlyRegHrs,
                hiddenFields
            }
        });

        // console.log({ intensiveReports })

        intensiveReports = intensiveReports.filter(r => r.indexPrices);

        // filter balance reports
        const lastReport = intensiveReports[intensiveReports.length - 1];
        if (!lastReport) return;
        const d = new Date(lastReport.time);

        const allDates = [...new Set(intensiveReports.map(report => (new Date(report.time)).toLocaleDateString()))];
        // const numDaysToShow = timeFilter === 'onlyToday' ? 1 : allDates.length;

        const startIndex = (() => {
            const startDate = allDates[allDates.length - numDaysToShow - 1];
            const first = !startDate ? 0 : intensiveReports.length - intensiveReports.slice().reverse().findIndex(report =>
                (new Date(report.time)).toLocaleDateString() === startDate && isRegularHours(report)
            ) - 1;
            console.log({
                allDates,
                startDate,
            })
            // console.log({ allDates, startDate, lastRegularReport })
            return first;
        })();

        intensiveReports = intensiveReports.slice(startIndex);



        // stats!
        const getStats = prop => {
            const first = get(intensiveReports[0], prop);
            let copy = [...intensiveReports];
            if (onlyRegHrs) {
                copy = copy.filter(report => report.isRegularHours);
            }
            // console.log({ copy})
            const compareIndex = hoverIndex ? hoverIndex : copy.length - 1;
            const compare = get(copy[compareIndex], prop);
            return {
                current: compare,
                absolute: compare - first,
                trend: getTrend(compare, first)
            };
        };

        const stats = mapObject({
            // TODO: hiddenFields
            alpaca: 'alpacaBalance',
            robinhood: 'accountBalance',
        }, getStats);

        const indexStats = mapObject({
            nasdaq: 'indexPrices.nasdaq',
            russell2000: 'indexPrices.russell2000',
            SP500: 'indexPrices.sp500',
            bitcoin: 'indexPrices.btc'
        }, getStats);

        hiddenFields.forEach(field => {
            const key = {
                'account balance': 'robinhood',
                'alpaca balance': 'alpaca',
                btc: 'bitcoin'
            }[field];
            delete stats[key];
            delete indexStats[key];
            console.log({
                field,
                key,
                stats,
                indexStats
            })
        });

        console.log({ indexStats})

        // authLevel!

        if (authLevel < 2) {
            intensiveReports = intensiveReports.map(({ accountBalance, alpacaBalance, ...report }) => ({
                ...report
            }));
        }


        // day pruning

        const numReports = intensiveReports.length;
        let numDaysToPrune = smallDevice ? Math.ceil(numReports / 350) : numDaysToShow;
        intensiveReports = pruneByDays(intensiveReports, numDaysToPrune);
        intensiveReports = pruneByDays(intensiveReports, fuzzFactor);



        const numNotReg = intensiveReports.findIndex(isRegularHours);
        
        // console.log({ numReports, smallDevice, numDaysToPrune, afterCount: intensiveReports.length })

        // const numToShow = numDaysToShow === 1
        //     ? (() => {
        //         const index = intensiveReports.slice().reverse().findIndex(r => 
        //             (new Date(r.time)).getDate() !== date
        //         );
        //         console.log({ index})
        //         firstOfDay = intensiveReports[intensiveReports.length - index];
        //         return intensiveReports.length - index
        //     })() : 0;
        // intensiveReports = intensiveReports.slice(0 - dataSlice);

        // console.log({ lines: getNewDayLines(intensiveReports)})   

        // more code!
        
        let firstOfDay;
        let chartData = (() => {
            // console.log({timeFilter})
            // if (timeFilter === '2019') {
            //     return reportsToChartData.balanceChart(dayReports ? dayReports : []);
            // }
            // nope not overall
            // data coming from balance reports
            const chartData = reportsToChartData.balanceChart(intensiveReports, hiddenFields);
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

        // remove noise


        console.log({ chartData})

        chartData = (() => {
            let removeOutlierIndexes = [];
            chartData.datasets.forEach(dataset => {
                const outliers = getOutlierIndexes(dataset.data);
                console.log({
                    label: dataset.label,
                    outliers
                });
                removeOutlierIndexes = [
                    ...removeOutlierIndexes,
                    ...outliers
                ];
                console.log({ removeOutlierIndexes})
            });
            const uniqIndexes = [...new Set(removeOutlierIndexes)].sort((a, b) => b - a);
            uniqIndexes.forEach(index => removeReports(chartData, index, 1));
            console.log({uniqIndexes})
            return chartData;
        })();



        // console.log({ indexStats})
        const showingSince = firstOfDay ? firstOfDay : intensiveReports[0];
        // console.log({ showingSince, firstOfDay, intensiveReports })
        // const afterHoursBoxes = getAfterHoursBoxes(intensiveReports);

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
        // console.log(getNewDayLines(intensiveReports))
        // console.log('hi', (new Array(allDates.length)).map((_, i) => i))


        // last minute mods


        // deal with afterhours
        const afterHoursBoxes = getAfterHoursBoxes(intensiveReports);
        console.log({ onlyRegHrs })
        if (onlyRegHrs) {
            removeAfterHours(chartData, afterHoursBoxes);
            if (!intensiveReports[intensiveReports.length - 1].isRegularHours) {
                removeReports(chartData, chartData.labels.length - 1, 1);
            }
        }
        removeReports(chartData, 0, 1);
        
        this.setState({
            intensiveData: {
                chartData,
                stats,
                indexStats,
                allDates,
                showingSince,
                afterHoursBoxes,
            },
            ...!keyData && {
                keyData: reportsToChartData.balanceChart(intensiveReports, []).datasets.map(d => pick(d, ['label', 'borderColor']))
            }
        });
    }
    setTimeFilter = timeFilter => this.setState({ timeFilter });
    toggleField = field => {
        const { hiddenFields } = this.props;
        const alreadyHidden = hiddenFields.includes(field);
        console.log({
            field,
            alreadyHidden,
            hiddenFields
        })
        this.props.setAppState({
            hiddenFields: alreadyHidden
                ? hiddenFields.filter(f => f !== field)
                : [...hiddenFields, field]
        });
    };
    render () {
        let { balanceReports, authLevel, collections, lastCollectionRefresh, additionalAccountInfo: { cash, buyingPower, daytradeCount, maintenanceMargin, longMarketValue }, setAppState, lowKey, onlyRegHrs, hiddenFields } = this.props;
        let { timeFilter, numDaysToShow, hoverIndex, fuzzFactor, afterHoursAnnotations, animateCount, intensiveData, keyData } = this.state;
        if (!balanceReports || !balanceReports.length || !intensiveData) return <b>LOADING</b>;
        const { chartData, stats, indexStats, allDates, showingSince, afterHoursBoxes,   } = intensiveData;

        console.log({ chartData });

        const slicedChartData = JSON.parse(JSON.stringify(chartData));
        if (animateCount !== null) {
            slicedChartData.datasets.forEach((dataset, index) => {
                dataset.data.splice(animateCount);
            });
            slicedChartData.labels.splice(animateCount);
            console.log({ slicedChartData })
        }



        // tablet formatting

        const allDatas = slicedChartData.datasets.map(dataset => dataset.data);
        const allValues = allDatas.reduce((acc, vals) => [...acc, ...vals], []);
        
        const min = Math.floor(_.min(allValues));
        const max = Math.ceil(_.max(allValues));
        const stepSize = Math.ceil((max - min) / 13);


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
                            <a href="#" onClick={() => this.setState({ numDaysToShow: 2 })}>[reset]</a>&nbsp;&nbsp;&nbsp;
                            {
                                authLevel === 2 && (
                                    <label>
                                        <input type="checkbox" checked={lowKey} onClick={() => setAppState({ lowKey: !lowKey })} /> 
                                        &nbsp;&nbsp;Lowkey
                                    </label>
                                )
                            }
                            &nbsp;&nbsp;&nbsp;
                            <label>
                                <input type="checkbox" checked={onlyRegHrs} onClick={() => {
                                    setAppState({ onlyRegHrs: !onlyRegHrs })
                                }} /> 
                                &nbsp;&nbsp;Only Reg Hrs
                            </label>


                            {
                                this.state.btcPrice && (
                                    <div className="bitcoin">
                                        Bitcoin: 
                                        <Odometer 
                                            value={this.state.btcPrice} 
                                            format="(,ddd).dd"
                                            duration={500}
                                            style={{ fontSize: '15px' }}
                                        />
                                    </div>
                                )
                            }<hr/>
                                
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
                                Maintenence Amt: ${maintenanceMargin}<br/>
                                Long Market Value: ${longMarketValue}
                            </div>
                        )
                    }
                    <div style={{ paddingLeft: '5em', display: 'none' }}>
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
                            value={(stats.alpaca || {}).current} 
                            format="(,ddd).dd"
                            duration={500}
                            />
                    </div>
                    <div style={{ fontSize: '80%', textAlign: 'right'  }}>
                        trend since {new Date((showingSince || {}).time).toLocaleString()}<br/>
                        {
                            authLevel === 2 && Object.keys(stats).map(stat => (
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
                                    Object.keys(indexStats)
                                        .map(stat => ({
                                            label: stat,
                                            value: indexStats[stat].trend
                                        }))
                                        .sort((a, b) => b.value - a.value)
                                        .map(({ label, value }) => (
                                            <tr>
                                                <td>{label}</td>
                                                <td>
                                                    <TrendPerc value={value} />
                                                </td>
                                            </tr>
                                        ))
                                }
                            </table>
                        </div>
                    </div>
                </div>
                <div className='chart-key'>
                    {
                        keyData.map(({ label, borderColor }) => (
                            <div onClick={() => this.toggleField(label)}  style={{ textDecoration: hiddenFields.includes(label) ? 'line-through' : '' }}>
                                <div className='key-sq' style={{ backgroundColor: borderColor }}>
                                    { hiddenFields.includes(label) ? '' : 'X'}
                                </div>
                                {label} - {borderColor}
                            </div>
                        ))
                    }
                </div>
                <div style={{ height: '90%' }} className='wider-container'>
                    <Line 
                        data={slicedChartData} 
                        plugins={[ChartAnnotation]}
                        options={{
                            events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
                            animation: !!timeFilter === '2019',
                            // onHover: (event, chartEls) => this.setState({ hoverIndex: get(chartEls[0], '_index') }),
                            // responsive: true,
                            maintainAspectRatio : false,
                            legend: {
                                display: false
                            },
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
                                    ...annotateLines(getNewDayLines(slicedChartData)),

                                ]
                            },
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