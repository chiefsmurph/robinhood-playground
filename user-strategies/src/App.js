import socketIOClient from "socket.io-client";
import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import getTrend from './utils/get-trend';

const defaultStrategyString = [
  `function trendFilter(trend) {
    return trend
      .sort((a, b) => b.trendSinceOpen - a.trendSinceOpen)[0].ticker
  }`
].join('\n');

const objMap = (obj, fn) => obj 
  ? Object.keys(obj).reduce((acc, key) => ({ 
    ...acc, 
    [key]: fn(obj[key], key)
  }), {})
  : {};


const ResultsTable = ({ data }) => {
  if (!Object.keys(data).length) return null;
  return (
    <table className="blueTable">
      <thead>
        <tr>
          <th>run-time</th>
          <th>ticker</th>
          <th>thenPrice</th>
          <th>nowPrice</th>
          <th>trend %</th>
        </tr>
      </thead>
      <tbody>
        {
          Object.keys(data).map(key => {
            const row = data[key];
            return (
              <tr>
                <td>{key}</td>
                <td>{row.ticker}</td>
                <td>{row.thenPrice}</td>
                <td>{row.nowPrice}</td>
                <td>{row.trend}</td>
              </tr>
            )
          })
        }
      </tbody>
    </table>
  )
};

class App extends Component {
  state = {
    status: null,
    currentPrices: null,
    recentTrends: null,
    results: null
  };
  textarea = null;
  socket = null;
  componentDidMount() {
    let { origin: endPoint } = window.location;
    this.socket = socketIOClient('http://192.227.186.138:3000');
    // this.socket = socketIOClient('http://localhost:3000');
    this.socket.on('server:current-prices', data => {
      console.log(data, 'current');
      this.setState({ currentPrices: data });
    });
    this.socket.on('server:user-strat', userStrat => {
      console.log('received', userStrat);
      this.setState(({ recentTrends }) => ({
        ...recentTrends,
        userStrat
      }));
    });
  }
  getRecentTrends = () => new Promise(resolve => {
    if (this.state.recentTrends) {
      console.log('got from state', this.state.recentTrends)
      return setTimeout(() => resolve(this.state.recentTrends), 1200);
    }
    console.log('sending getrecenttrends')
    this.socket.emit('getRecentTrends', recentTrends => {
      console.log({recentTrends})
      this.setState({ recentTrends }, () => resolve(recentTrends));
    });
  });
  runStrategy = async () => {
    let fnForm;
    try {
      fnForm = eval(`(${this.textarea.value})`);
    } catch (e) {
      console.log('error');
      return;
    }
    
    console.log('getting recent trends');
    this.setState({ 
      status: 'loading recent trends',
      results: null
    });
    const recentTrends = await this.getRecentTrends();
    console.log('got most recent trends');
    this.setState({ status: 'running strategy function on recent trends' });

    // const withObjs = objMap(results, val => lastTrend.find(t => t.ticker === val));

    await new Promise(resolve => setTimeout(resolve, 1200));
    const withObjs = objMap(recentTrends, val => {
      const result = fnForm(val);
      const withObj = val.find(t => t.ticker === result);
      return withObj;
    });

    const allTickers = Object.keys(withObjs).map(key => withObjs[key].ticker);
    this.socket.emit('get-current-prices', allTickers);
    
    console.log(
      {withObjs}
    );

    this.setState({ results: withObjs });

    this.setState({ status: '' });

    // console.log(lastTrend, this.textarea.value, this.textarea);
  }
  render() {
    const { results, currentPrices, status } = this.state;
    const resultsWithThenPrice = objMap(results, trendObj => ({
      ticker: trendObj.ticker,
      thenPrice: trendObj.quote_data.lastTrade,
    }));
    const resultsWithNowPrice = objMap(resultsWithThenPrice, data => {
      const nowPrices = (currentPrices || {})[data.ticker] || {};
      console.log(nowPrices, data.ticker, data, currentPrices);
      return {
        ...data,
        nowPrice: nowPrices.afterHoursPrice || nowPrices.lastTradePrice,
      };
    });
    const resultsData = objMap(resultsWithNowPrice, data => ({
      ...data,
      trend: getTrend(data.nowPrice, data.thenPrice)
    }));
    console.log('render', { resultsData })
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Run a strategy against the top 100 stocks trending on Robinhood</h1>
        </header>
        <p className="App-intro">
          <textarea 
            style={{width: '60%', height: '200px'}} 
            ref={ref => { this.textarea = ref;}}
            defaultValue={defaultStrategyString}
            />
          <br/>
          <button style={{ width: '60%', fontSize: '200%'}} onClick={this.runStrategy}>Run strategy!</button>
          <div><i>{status}</i></div>
          <ResultsTable data={resultsData} />
          {/* <textarea value={JSON.stringify(resultsData, null, 2)} />
          <code>
            {JSON.stringify(currentPrices, null, 2)}
          </code> */}
        </p>
      </div>
    );
  }
}

module.exports = App;
