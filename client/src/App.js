import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './App.css';
import './pages/Closed.css';

import { ClipLoader } from "react-spinners";
import { WithContext as ReactTags } from 'react-tag-input';

import ReactModal from 'react-modal';
import PickGraphs from './components/PickGraphs';


import getByDateAnalysis from './analysis/get-bydate-analysis';
import getOverallAnalysis from './analysis/get-overall-analysis';
import getSubsets from './analysis/get-subsets';


import ReactHintFactory from 'react-hint';
import 'react-hint/css/index.css'


import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import Popup from "reactjs-popup";

import PmReport from './pages/PmReport';
import BalanceReports from './pages/BalanceReports';
import Preferences from './pages/Preferences';
import TodaysStrategies from './pages/TodaysStrategies';
import Positions from './pages/Positions';
import DayReports from './pages/DayReports';
import Settings from './pages/Settings';
import Cron from './pages/Cron';
import Analysis from './pages/Analysis';
import Scan from './pages/Scan';
import Closed from './pages/Closed';
import Derived from './pages/Derived';
import Logs from './pages/Logs';
import RecentPicks from './pages/RecentPicks';
import Stock from './pages/Stock';

import socketIOClient from "socket.io-client";
import { partition, mapObject } from 'underscore';
import getTrend from './utils/get-trend';

import ReactGA from 'react-ga';
import DateAnalysis from './pages/DateAnalysis';
ReactGA.initialize('UA-131761952-1', { debug: false });


const ReactHint = ReactHintFactory(React)

const renderTooltip = (target) => {
    const {tooltipStr} = target.dataset;
    // console.log(target.dataset)
    return (
        <pre className={'react-hint__content'}>
            {tooltipStr}
        </pre>
    );
};

function TabContainer(props) {
    return (
        <Typography component="div" style={{ padding: 8 * 3 }}>
        {props.children}
        </Typography>
    );
}
  
TabContainer.propTypes = {
    children: PropTypes.node.isRequired
};

function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
        return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
    }).replace(/\s+/g, '');
}

var notification = new Audio('slow-spring-board.mp3');


const matchesPm = (stratMin, pm, pms) => {
    const arrayOfArrays = pms[pm] || [];
    return arrayOfArrays.some(parts => {
        parts = Array.isArray(parts) ? parts : [parts];
        return parts.every(part => {
            part = part.toString();
            if (part.startsWith('!')) {
                return !stratMin.includes(part.slice(1));
            }
            return (new RegExp(`(?<!!)${part}-`)).test(stratMin);
        });
    });
    // return pms[pm] && pms[pm].every(part => strat === part || strat.includes(`${part}-`) || strat.includes(`-${part}`));
};

const isForPurchase = (stratMin, settings = {}, pms) => {

    let [forPurchasePms, forPurchaseStrats] = partition(
        settings.forPurchase || [],
        line => (line.startsWith('[') && line.endsWith(']'))
    );

    forPurchasePms = forPurchasePms.map(line => line.substring(1, line.length - 1));
    // console.log({ forPurchasePms, forPurchaseStrats})

    return (
        forPurchaseStrats.includes(stratMin) ||
        forPurchasePms.some(pm => 
            matchesPm(stratMin, pm, pms)
        )
    );


};


// authLevel
    // 0 public
    // 1 friends
    // 2 me

const pages = [
    {
        label: 'Home',
        component: BalanceReports,
        // render: state => 
    },
    {
        label: 'Logs',
        component: Logs,
        authLevel: 2,
    },
    {
        label: 'Preferences',
        component: Preferences,
        authLevel: 2,
    },
    {
        label: "Today",
        component: TodaysStrategies,
        authLevel: 1,
    },
    {
        label: "PM's",
        component: PmReport,
        render: state  => <PmReport {...state} />,
        authLevel: 1,
    },
    
    {
        label: 'Positions',
        component: Positions,
        authLevel: 2,
    },
    // {
    //     label: 'Analysis',
    //     component: Analysis,
    // },
    {
        label: 'Closed',
        component: Closed,
        authLevel: 2,
    },
    {
        label: 'Date Analysis',
        component: DateAnalysis,
        authLevel: 2,
    },
    {
        label: 'Recent Picks',
        component: RecentPicks,
        authLevel: 1,
    },
    {
        label: 'Single Stock',
        component: Stock,
        authLevel: 1,
    },
    // {
    //     label: 'Stocks To Watch',
    //     component: Derived,
    //     allowPublic: true,
    // },
    // {
    //     label: 'Scan',
    //     component: Scan,
    // },
    // // {
    //     label: 'Day Reports',
    //     component: DayReports
    // },
    {
        label: 'Settings',
        component: Settings,
        authLevel: 2,
    },
    {
        label: 'Cron',
        component: Cron,
        authLevel: 2,
    }
];



const KeyCodes = {
    comma: 188,
    enter: 13,
  };
   
const delimiters = [KeyCodes.comma, KeyCodes.enter];
const createTag = text => ({ text, id: text });

class App extends Component {
    state = {
        value: 0,
        socket: null,
        tags: ['notManual', 'lastTen'].map(createTag),
        authLevel: 0,
        onlyRegHrs: false,
        lowKey: true,
        hiddenFields: window.location.href.includes('balance') ? [] : ['account balance'],
        // hiddenFields: [],
    };

    handleDelete = i => {
        const { tags } = this.state;
        this.setState({
            tags: tags.filter((tag, index) => index !== i),
        });
    }
    handleAddition = tag => {
        const { tags = [] } = this.state;
        const newTags = [...tags, tag];
        this.setState({ tags: newTags });
    }

    componentDidMount() {
        console.origLog = console.log;
        console.log = () => {};

        let { origin } = window.location;

        const urlParams = new URLSearchParams(window.location.search);
        const port = urlParams.get('p') || 3001;

        const socketEndpoint = origin.includes('localhost') && false ? 'http://localhost:3000' : `https://chiefsmurph.com`;
        const socket = socketIOClient(socketEndpoint, {
            path: '/rh/socket.io',
            secure: true
        });

        const handlePick = data => {
            const { settings, pms } = this.state;
            this.setState({
                picks: [data].concat(this.state.picks),
            });
            const isSprDwn = data.stratMin.includes('supr-dwn');
            if (!data.isRecommended || !isForPurchase(data.stratMin, settings, pms) || isSprDwn) {
                return;
            }
            notification.play();
            console.log({ data })
            this.setState({
                showingPick: {
                  ...data,
                  newPick: true
                }
            })
            // setTimeout(() => {
            //     this.setState({
            //         newPicksData: null
            //     });
            // }, 10000);
        };
        socket.on('server:picks-data', handlePick);
        // setTimeout(() => {
        //     const fakePick = {
        //         "stratMin": "fake-pick-fake-pick",
        //         "withPrices": [
        //           {
        //             "_id": "5c4b18084d16ab0849176862",
        //             "ticker": "OGZPY",
        //             "price": 4.86
        //           }
        //         ]
        //       };
        //       handlePick(fakePick);
        // }, 5000)
        socket.on('server:log', data => {
            // console.log({ data })
            this.setState(({ mostRecentLogs }) => ({
                mostRecentLogs: [
                    data,
                    ...mostRecentLogs || []
                ]
            }));
        })
        socket.on('server:data-update', data => {
            console.log(data, 'data-update')
            this.setState(data);
        });
        socket.on('server:related-prices', data => {
            // console.log({ relatedPrices: data });
            this.setState({ relatedPrices: data });
        });
        socket.on('server:pm-perfs', data => {
            // console.log({ pmPerfs: data });
            this.setState({ pmPerfs: data });
        });
        socket.emit('getDayReports', data => {
            // console.log({ data});
            this.setState(data);
        });
        socket.on('server:balance-report', ({ report, additionalAccountInfo }) => {
            console.log('received balance report', report, this.state.balanceReports)
            this.setState(({ balanceReports }) => ({
                balanceReports: (balanceReports || []).concat(report),
                additionalAccountInfo
            }));
        });
        this.setState({ socket }, () => {
            const savedAuth = localStorage.getItem('placate');
            if (savedAuth) {
                this.attemptAuth(savedAuth);
            }
        });
        ReactGA.pageview(window.location.pathname + 'index');
    }

    handlePageChange = (event, value) => {
        ReactGA.pageview(window.location.pathname + camelize(pages[value].label.replace(/'/g, '')));
        this.setState({ value });
    };

    setAuthLevel = authLevel => {
        this.setState({ authLevel });
        if (authLevel === 2) {
            console.log = console.origLog;
        }
    };

    attemptAuth = authString => {
        if (!authString) return;
        console.log('attempt auth', { authString })
        this.state.socket.emit('attemptAuth', authString, authLevel => {
            console.log("received auth response", authLevel);
            this.setAuthLevel(authLevel);
            if (!authLevel) {
                localStorage.clear();
            } else {
                localStorage.setItem('placate', authString);
            }
        });
    };

    auth = () => {
        const authString = window.prompt('');
        this.attemptAuth(authString);
    }
    render () {
        let { value, derivedCollections, predictionModels, pms, balanceReports, newPicksData, positions, relatedPrices, showingPick, socket, authLevel } = this.state;
        const isLoading = !derivedCollections;


        positions = mapObject(
            positions || {},
            positions => positions
                .map(pos => {
                    const { afterHoursPrice, lastTradePrice } = relatedPrices[pos.ticker] || {};
                    const currentPrice = afterHoursPrice || lastTradePrice || Number(pos.current_price);
                    pos.currentPrice = currentPrice;
                    pos.unrealizedPl = +(pos.quantity * (pos.currentPrice - pos.avgEntry)).toFixed(2);
                    pos.unrealizedPlPc = getTrend(currentPrice, pos.avgEntry);
                    pos.equity = (pos.quantity * currentPrice).toFixed(2);
                    const netImpact = Number(pos.sellReturnDollars || 0) + pos.unrealizedPl;
                    pos.netImpact = netImpact;
                    pos.impactPerc = +(netImpact / pos.totalBuyAmt * 100).toFixed(2);
                    return pos;
                })
                .sort(({ equity: a }, { equity: b }) => {

                    if( !isFinite(a) && !isFinite(b) ) {
                        return 0;
                    }
                    if( !isFinite(a) ) {
                        return 1;
                    }
                    if( !isFinite(b) ) {
                        return -1;
                    }
                    return b - a;
                })
        );


        // position analysis

        let { 
            // positions: { alpaca: open = [] } = {}, 
            // analyzedClosed: closed = [], 
            tags,
            includeOpen
        } = this.state;
        const open = positions.alpaca || [];
        const closed = this.state.analyzedClosed || [];
        const allPositions = [
            ...open.map(pos => ({
                ...pos,
                isOpen: true
            })),
            ...closed
        ]
        .map(({ interestingWords, ...rest }) => ({
            ...rest,
            interestingWords: interestingWords || []
        }))
        .sort((a, b) => (new Date(b.date)).getTime() - (new Date(a.date)).getTime());
        
        const subsets = getSubsets(allPositions);
        const filteredPositions = allPositions
            .filter(position => {
                return tags.every(({ text: subsetName }) => {
                    return subsets[subsetName](position);
                });
            })
            .filter(position => includeOpen || !position.isOpen);

        let dateAnalysis = getByDateAnalysis(filteredPositions);
        let overallAnalysis = getOverallAnalysis(filteredPositions, subsets);
        const suggestions = Object.keys(overallAnalysis).map(subset => ({ id: subset, text: subset }));
        const passToPages = {
            ...this.state,
            handlePageChange: this.handlePageChange, 
            setAppState: state => {
                console.log({ update: state })
                this.setState(state);
            },
            // position analysis
            allPositions,
            filteredPositions,
            dateAnalysis, 
            overallAnalysis,
            suggestions,
            subsets
        };

        const tabs = pages
            .filter(page => authLevel >= (page.authLevel || 0))
            .map(({ label }) => label);
        

        const showingPage = value || 0;
        const thing = pages.find(page => page.label === tabs[showingPage]);
        const { component: PageComponent } = thing;
        return (
            <div className="App">
                <AppBar 
                    position="static"
                    style={{
                        minWidth: authLevel === 2 ? '1000px' : ''
                    }}
                >
                    <Toolbar>
                        <Typography variant="title" color="inherit">
                            chiefsmurph's stock <a href="#" onClick={this.auth} style={{ color: 'orange' }}>picks</a><br/>
                            {/* <a href="https://github.com/chiefsmurph/robinhood-playground" target='_blank' style={{ color: 'darkorange', fontSize: '80%'}}>
                                https://github.com/chiefsmurph/robinhood-playground
                            </a> */}
                        </Typography>
                        {
                            authLevel === 2 && (
                                <div>
                                    <ReactTags
                                        tags={tags}
                                        suggestions={suggestions}
                                        handleDelete={this.handleDelete}
                                        handleAddition={this.handleAddition}
                                        // handleDrag={this.handleDrag}
                                        delimiters={delimiters} />
                                </div>
                            )
                        }
                    </Toolbar>
                    { authLevel >= 1 && (
                        <Tabs value={value} onChange={this.handlePageChange} scrollButtons="auto">
                            { tabs.map(label => <Tab label={label} />) }
                        </Tabs>
                    )}
                </AppBar>


                <style>{`.react-hint__content { color: white; margin: 0; }`}</style>
                    
                <ReactHint persist
                    attribute="data-custom"
                    autoPosition events 
                    // className="custom-hint"
                    // events={{click: true}}
                    onRenderContent={renderTooltip}
                    // ref={(ref) => this.instance = ref} 
                />


                { isLoading ? (
                    <div style={{ justifyContent: 'center', alignItems: 'center', display: 'flex', height: '70vh' }}>
                        <ClipLoader
                            // css={override}
                            size={150}
                            //size={"150px"} this also works
                            color={"#123abc"}
                            loading={true}
                        />
                    </div>
                    // <h1 style={{ textAlign: 'center' }}>loading</h1>
                ) : <PageComponent 
                      {...passToPages}
                      positions={positions}
                      showPick={pick => this.setState({ showingPick: pick })}
                      />
                }

                <Popup position="right center" modal open={newPicksData}>
                    <h2>ALERT ALERT NEW <b>PICK</b></h2>
                    <pre>{JSON.stringify(newPicksData, null, 2)}</pre>
                </Popup>

                <ReactModal isOpen={!!showingPick}>
                    <button 
                        onClick={() => this.setState({ showingPick: null })}
                        style={{
                            position: 'fixed',
                            zoom: '250%',
                            top: '1vh',
                            left: '1vh',
                        }}>
                            Close Modal
                    </button>
                    <br/><br/>
                    {showingPick && showingPick.newPick && <h3>🚀🚀🚀🚀 NEW PICK!! NEW PICK!! NEW PICK!! 🚀🚀🚀🚀</h3>}
                    <PickGraphs pick={showingPick} socket={socket} positions={positions} />
                </ReactModal>

                {/* <TabContainer> */}
                    
                {/* </TabContainer> */}
                
            </div>
        );
    }
    
}

export default App;
